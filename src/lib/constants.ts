export const TEAM_NAME = "Eleven Super Kings";

/** UPI ID collections get paid to — used to build "Pay via UPI" deep links. */
export const TEAM_UPI_ID = "vrchockers-4@okaxis";

/** Expense buckets carried over from the Excel ledger. */
export const EXPENSE_CATEGORIES = [
  "Ball fee",
  "Ground fee",
  "Tournament fee",
  "Water",
  "Bakery",
  "Food",
  "Fuel/Car",
  "Umpire Fee",
  "MoM",
  "Others",
] as const;

export type ExpenseCategory = (typeof EXPENSE_CATEGORIES)[number];

/** The category that counts against a tournament's total entry fee. */
export const TOURNAMENT_FEE_CATEGORY = "Tournament fee";

export const OVERS_OPTIONS = [20, 25, 30, 35, 40, 45, 50] as const;

export const MATCH_FEE_OPTIONS = [100, 200] as const;

/** Tailwind accent per category, used for the coloured dots in expense lists. */
export const CATEGORY_COLORS: Record<string, string> = {
  "Ball fee": "bg-ios-red",
  "Ground fee": "bg-ios-green",
  "Tournament fee": "bg-ios-indigo",
  Water: "bg-ios-teal",
  Bakery: "bg-ios-orange",
  Food: "bg-ios-pink",
  "Fuel/Car": "bg-ios-purple",
  "Umpire Fee": "bg-ios-blue",
  MoM: "bg-ios-yellow",
  Others: "bg-ios-gray",
};
