export const TEAM_NAME = "Eleven Super Kings";

/** UPI ID collections get paid to — used to build "Pay via UPI" deep links. */
export const TEAM_UPI_ID = "vrchockers-4@okaxis";

/**
 * The account-holder name registered against TEAM_UPI_ID, exactly as the UPI
 * network returns it.
 *
 * This is NOT the team name, and the difference is the whole point. A paying
 * app resolves the VPA to its real registered name and compares it with the
 * `pn` in the link; a mismatch is the signature of a deep-link spoof (a link
 * claiming to pay one party while the VPA belongs to another), so risk engines
 * block it — and surface it as a misleading "exceeded the bank limit" error.
 * Sending the team name here is what triggered that on every intent payment,
 * while the same VPA typed by hand went through fine.
 *
 * If the VPA is ever changed, this has to change with it.
 */
export const TEAM_UPI_NAME = "Anbarasu Rajamanickam";

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
