import { axiosInstance } from "@/services/axiosInstance";

export type InsightPreset =
  | "today"
  | "yesterday"
  | "last7"
  | "last30"
  | "thisMonth"
  | "lastMonth"
  | "year"
  | "custom";

export type InsightSegment = "all" | "food" | "space" | "store";
export type InsightMembership = "all" | "member" | "nonmember";

export type InsightQuery = {
  preset: InsightPreset;
  from?: string;
  to?: string;
  segment: InsightSegment;
  membership: InsightMembership;
};

export type RankedItem = {
  name: string;
  qty: number;
  revenue: number;
  orders: number;
  image?: string;
  sku?: string;
  bookings?: number;
  hours?: number;
};

export type SegmentCard = {
  key: "food" | "space" | "store";
  label: string;
  revenue: number;
  share: number;
  bills: number;
  qty: number;
  bookings: number;
  hours: number;
  average: number;
  previousRevenue: number;
  changePct: number | null;
  top: RankedItem[];
};

export type InsightsPayload = {
  success: boolean;
  generatedAt: string;
  definition: string;
  range: { from: string; to: string; days: number; preset: string };
  previousRange: { from: string; to: string };
  totals: { revenue: number; bills: number; previousRevenue: number; changePct: number | null };
  segments: SegmentCard[];
  membership: {
    memberRevenue: number;
    otherRevenue: number;
    memberBills: number;
    otherBills: number;
    memberShare: number;
    otherShare: number;
  };
  top: { food: RankedItem[]; space: RankedItem[]; store: RankedItem[] };
  visitors: {
    unique: number;
    firstTime: number;
    repeat: number;
    firstShare: number;
    repeatShare: number;
  };
  peak: {
    periods: { key: string; label: string; hint: string; bills: number; revenue: number; share: number }[];
    busiestPeriod: string;
    highestRevenuePeriod: string;
    totalBills: number;
    averageBillsPerDay: number;
    weekdays: { day: string; bills: number; revenue: number }[];
    busiestDay: string;
  };
};

export type VisitorRow = {
  key: string;
  name: string;
  phone: string;
  visits: number;
  bills: number;
  firstVisit: string;
  lastVisit: string;
  spend: number;
  visitType: "Repeat" | "First Time";
  member: boolean;
};

export type VisitHistory = {
  customer: { key: string; name: string; phone: string; member: boolean };
  lifetime: { bills: number; spend: number; firstVisit: string; lastVisit: string };
  range: {
    from: string;
    to: string;
    visits: number;
    bills: number;
    spend: number;
    average: number;
    billsList: { invoiceCode: string; date: string; amount: number; items: string[] }[];
  };
};

const paramsOf = (query: InsightQuery) => ({
  preset: query.preset,
  from: query.preset === "custom" ? query.from : undefined,
  to: query.preset === "custom" ? query.to : undefined,
  segment: query.segment,
  membership: query.membership,
});

export const fetchInsights = async (query: InsightQuery) => {
  const response = await axiosInstance.get<InsightsPayload>("/analytics/insights", {
    params: paramsOf(query),
  });
  return response.data;
};

export const fetchVisitors = async (
  query: InsightQuery & {
    bucket: "day" | "week" | "month";
    visits: "all" | "1" | "2" | "3";
    page: number;
    search?: string;
  },
) => {
  const response = await axiosInstance.get<{
    rows: VisitorRow[];
    pagination: { page: number; limit: number; total: number; pages: number };
  }>("/analytics/visitors", {
    params: { ...paramsOf(query), bucket: query.bucket, visits: query.visits, page: query.page, limit: 8, search: query.search || undefined },
  });
  return response.data;
};

export const fetchVisitHistory = async (key: string, query: InsightQuery) => {
  const response = await axiosInstance.get<VisitHistory>(
    `/analytics/visitors/${encodeURIComponent(key)}`,
    { params: paramsOf(query) },
  );
  return response.data;
};
