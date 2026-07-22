import type { ReactNode } from "react";

export function PageContainer({
  children,
  description,
  eyebrow,
  title
}: {
  children?: ReactNode;
  description?: string;
  eyebrow?: string;
  title: string;
}) {
  return (
    <section className="page-container">
      {eyebrow ? <p className="page-eyebrow">{eyebrow}</p> : null}
      <h1 className="page-title">{title}</h1>
      {description ? <p className="page-description">{description}</p> : null}
      {children}
    </section>
  );
}
