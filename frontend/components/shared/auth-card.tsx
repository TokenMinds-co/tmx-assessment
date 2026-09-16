import { Card, CardContent, CardDescription, CardHeader } from "@/components/ui/card";

/**
 * The card every sign-in page renders under the logo: a heading, an optional
 * line of help, the form, and an optional line under the card.
 */
export function AuthCard({
  title,
  description,
  footer,
  children,
}: {
  title: string;
  description?: React.ReactNode;
  footer?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-4">
      <Card size="lg">
        <CardHeader>
          <h1 className="text-xl font-bold text-foreground">{title}</h1>
          {description ? <CardDescription>{description}</CardDescription> : null}
        </CardHeader>
        <CardContent>{children}</CardContent>
      </Card>
      {footer ? <p className="text-center text-sm text-muted-foreground">{footer}</p> : null}
    </div>
  );
}
