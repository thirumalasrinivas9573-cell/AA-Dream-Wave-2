export type AccentColor =
  | "zinc"
  | "blue"
  | "teal"
  | "rose"
  | "amber"
  | "violet";

export type DashboardWidgetId =
  | "welcome"
  | "progress-stats"
  | "ai-summaries"
  | "recommendations"
  | "learning-insights"
  | "career-insights"
  | "productivity-insights"
  | "continue-learning"
  | "notifications"
  | "activity"
  | "quick-actions";

export type DashboardWidgetConfig = {
  id: DashboardWidgetId;
  label: string;
  description: string;
  visible: boolean;
};

export type SmartNotificationKind =
  | "suggestion"
  | "learning"
  | "assignment"
  | "career"
  | "reminder";

export type SmartNotification = {
  id: string;
  kind: SmartNotificationKind;
  title: string;
  body: string;
  href?: string;
  createdAt: string;
  read: boolean;
};

export type PersonalizationState = {
  widgetOrder: DashboardWidgetId[];
  widgets: DashboardWidgetConfig[];
  accent: AccentColor;
  favoriteSections: DashboardWidgetId[];
  quickActions: Array<{ label: string; href: string }>;
  notifications: SmartNotification[];
  denserLayout: boolean;
};
