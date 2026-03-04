"use client";

interface AdminPageHeaderProps {
  title: string;
  subtitle?: string;
  children?: React.ReactNode;
}

export function AdminPageHeader({ title, subtitle, children }: AdminPageHeaderProps) {
  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 className="font-sora text-3xl font-bold text-newayzi-jet tracking-tight">
          {title}
        </h1>
        {subtitle && (
          <p className="mt-2 text-sm text-gray-500 max-w-2xl">
            {subtitle}
          </p>
        )}
      </div>
      {children}
    </div>
  );
}
