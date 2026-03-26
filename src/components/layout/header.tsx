interface HeaderProps {
  title: string;
  description?: string;
  actions?: React.ReactNode;
}

export function Header({ title, description, actions }: HeaderProps) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-4 sm:px-8 py-4 sm:py-6 border-b border-border">
      <div className="pl-10 sm:pl-0">
        <h1 className="text-lg sm:text-xl font-semibold tracking-tight font-serif">{title}</h1>
        {description && (
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">{description}</p>
        )}
      </div>
      {actions && (
        <div className="flex items-center gap-2 sm:gap-3 flex-wrap pl-10 sm:pl-0">
          {actions}
        </div>
      )}
    </div>
  );
}
