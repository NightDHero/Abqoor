import types
import unittest
from unittest.mock import AsyncMock, patch

import bot


class FakeBot:
    def __init__(self) -> None:
        self.sent_messages: list[dict[str, object]] = []
        self.edited_messages: list[dict[str, object]] = []
        self.deleted_messages: list[tuple[int, int]] = []

    async def send_message(self, chat_id: int, text: str, reply_markup=None):
        message_id = 100 + len(self.sent_messages)
        payload = {
            "chat_id": chat_id,
            "text": text,
            "reply_markup": reply_markup,
            "message_id": message_id,
        }
        self.sent_messages.append(payload)
        return types.SimpleNamespace(message_id=message_id)

    async def edit_message_text(self, chat_id: int, message_id: int, text: str, reply_markup=None):
        self.edited_messages.append(
            {
                "chat_id": chat_id,
                "message_id": message_id,
                "text": text,
                "reply_markup": reply_markup,
            }
        )

    async def delete_message(self, chat_id: int, message_id: int):
        self.deleted_messages.append((chat_id, message_id))


class FakeRepository:
    def __init__(self) -> None:
        self.active_prompt_message_id: int | None = None
        self.plan: dict[str, object] | None = None
        self.summary: dict[str, object] | None = None
        self.session: dict[str, object] | None = None
        self.session_result = {"correct": 0, "total": 0}
        self.marked_completed: list[int] = []

    def get_active_prompt_message_id(self, telegram_user_id: int) -> int | None:
        return self.active_prompt_message_id

    def set_active_prompt_message_id(self, telegram_user_id: int, message_id: int | None) -> None:
        self.active_prompt_message_id = message_id

    def get_plan_by_telegram_id(self, telegram_user_id: int):
        return self.plan

    def get_mistake_bank_summary(self, telegram_user_id: int):
        return self.summary

    def get_latest_open_manual_review_session(self, telegram_user_id: int):
        return None

    def upsert_telegram_user(self, telegram_user):
        return 1

    def mark_session_completed(self, session_id: int) -> None:
        self.marked_completed.append(session_id)

    def get_session_by_id(self, session_id: int):
        return self.session

    def get_session_result(self, session_id: int):
        return self.session_result


class FakeApplication:
    def __init__(self, repository: FakeRepository | None = None) -> None:
        self.bot = FakeBot()
        self.bot_data = {
            "repository": repository or FakeRepository(),
            "settings": types.SimpleNamespace(),
        }


class PromptCleanupTests(unittest.IsolatedAsyncioTestCase):
    async def test_show_or_update_prompt_message_sends_new_prompt_and_deletes_source(self):
        application = FakeApplication()

        prompt_message_id = await bot.show_or_update_prompt_message(
            application,
            55,
            "hello",
            source_message_id=9,
        )

        self.assertEqual(prompt_message_id, 100)
        self.assertEqual(len(application.bot.sent_messages), 1)
        self.assertEqual(application.bot.sent_messages[0]["text"], "hello")
        self.assertEqual(application.bot.deleted_messages, [(55, 9)])
        self.assertEqual(application.bot_data["repository"].active_prompt_message_id, 100)

    async def test_show_or_update_prompt_message_edits_existing_prompt(self):
        repository = FakeRepository()
        repository.active_prompt_message_id = 77
        application = FakeApplication(repository)

        prompt_message_id = await bot.show_or_update_prompt_message(
            application,
            55,
            "updated",
            source_message_id=11,
        )

        self.assertEqual(prompt_message_id, 77)
        self.assertEqual(len(application.bot.sent_messages), 0)
        self.assertEqual(len(application.bot.edited_messages), 1)
        self.assertEqual(application.bot.edited_messages[0]["message_id"], 77)
        self.assertEqual(application.bot.deleted_messages, [(55, 11)])

    async def test_start_command_new_user_uses_begin_setup_intro_instead_of_extra_message(self):
        application = FakeApplication()
        application.bot_data["repository"].plan = None
        message = types.SimpleNamespace(message_id=44, reply_text=AsyncMock())
        update = types.SimpleNamespace(
            effective_chat=types.SimpleNamespace(type="private"),
            effective_user=types.SimpleNamespace(id=5),
            effective_message=message,
            callback_query=None,
        )
        context = types.SimpleNamespace(application=application, args=[])

        with patch("bot.begin_plan_setup", new=AsyncMock()) as begin_plan_setup:
            await bot.start_command(update, context)

        begin_plan_setup.assert_awaited_once()
        self.assertIn("intro_text", begin_plan_setup.await_args.kwargs)
        message.reply_text.assert_not_awaited()

    async def test_handle_menu_today_passes_source_message_id_to_session_start(self):
        application = FakeApplication()
        query = types.SimpleNamespace(
            data="menu:today",
            from_user=types.SimpleNamespace(id=8),
            message=types.SimpleNamespace(message_id=321),
            answer=AsyncMock(),
        )
        update = types.SimpleNamespace(callback_query=query)
        context = types.SimpleNamespace(application=application)

        with patch("bot.start_or_resume_today_session", new=AsyncMock()) as start_today:
            await bot.handle_menu_callback(update, context)

        start_today.assert_awaited_once()
        self.assertEqual(start_today.await_args.kwargs["source_message_id"], 321)

    async def test_handle_plan_text_input_existing_plan_refreshes_single_hub_prompt(self):
        repository = FakeRepository()
        repository.plan = {
            "display_name": "طالب",
            "onboarding_completed": 1,
            "telegram_user_id": 15,
        }
        application = FakeApplication(repository)
        message = types.SimpleNamespace(message_id=22, text="hello")
        update = types.SimpleNamespace(
            effective_chat=types.SimpleNamespace(type="private"),
            effective_user=types.SimpleNamespace(id=15),
            effective_message=message,
        )
        context = types.SimpleNamespace(application=application, user_data={})

        with (
            patch("bot.build_plan_summary", return_value="summary"),
            patch("bot.build_user_menu_keyboard", return_value="kb"),
            patch("bot.show_or_update_prompt_message", new=AsyncMock()) as show_prompt,
        ):
            await bot.handle_plan_text_input(update, context)

        show_prompt.assert_awaited_once()
        self.assertEqual(show_prompt.await_args.kwargs["source_message_id"], 22)
        self.assertEqual(show_prompt.await_args.args[2], "أهلا طالب\n\nsummary")

    async def test_handle_plan_text_input_invalid_count_reuses_prompt(self):
        application = FakeApplication()
        update = types.SimpleNamespace(
            effective_chat=types.SimpleNamespace(type="private"),
            effective_user=types.SimpleNamespace(id=19),
            effective_message=types.SimpleNamespace(message_id=33, text="abc"),
        )
        context = types.SimpleNamespace(
            application=application,
            user_data={
                "plan_setup": {
                    "days": {0, 1},
                    "question_count": None,
                    "step": "count",
                    "mode": "create",
                }
            },
        )

        with patch("bot.show_or_update_prompt_message", new=AsyncMock()) as show_prompt:
            await bot.handle_plan_text_input(update, context)

        show_prompt.assert_awaited_once()
        self.assertEqual(show_prompt.await_args.kwargs["source_message_id"], 33)

    async def test_send_mistake_bank_summary_without_summary_uses_prompt_message(self):
        repository = FakeRepository()
        repository.summary = None
        application = FakeApplication(repository)

        with patch("bot.show_or_update_prompt_message", new=AsyncMock()) as show_prompt:
            await bot.send_mistake_bank_summary(application, 27, source_message_id=44)

        show_prompt.assert_awaited_once()
        self.assertEqual(show_prompt.await_args.args[2], "ابدأ أولًا عبر /start حتى أجهز لك خطة شخصية.")
        self.assertEqual(show_prompt.await_args.kwargs["source_message_id"], 44)

    async def test_complete_session_routes_back_to_single_prompt(self):
        repository = FakeRepository()
        repository.plan = {"telegram_user_id": 91}
        repository.session = {"session_id": 7, "session_kind": "study"}
        repository.session_result = {"correct": 3, "total": 5}
        application = FakeApplication(repository)

        with (
            patch("bot.cleanup_session_messages", new=AsyncMock()) as cleanup,
            patch("bot.build_user_menu_keyboard", return_value="kb"),
            patch("bot.show_or_update_prompt_message", new=AsyncMock()) as show_prompt,
        ):
            await bot.complete_session(application, 7, 91)

        cleanup.assert_awaited_once()
        show_prompt.assert_awaited_once()
        self.assertIn("لقد أنهيت جلسة اليوم", show_prompt.await_args.args[2])


if __name__ == "__main__":
    unittest.main()