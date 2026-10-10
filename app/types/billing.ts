/** Plan card definition for the billing page pricing grid */
export interface BillingPlanFeature {
  text: string;
  tooltip: string;
}

export interface BillingPlan {
  name: string;
  key: "FREE" | "PER_TOURNAMENT" | "PRO" | "ENTERPRISE";
  description: string;
  monthlyPrice: number | string;
  yearlyPrice: number | string | null;
  planType: string | null;
  amountInKobo: number;
  features: BillingPlanFeature[];
  popular?: boolean;
  oneTime?: boolean;
}
