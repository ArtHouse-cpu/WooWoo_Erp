import RevenueCard from "@/features/home/components/RevenueCard";

export default function HomeScreen() {
  return (
    <div className="w-full flex justify-center gap-4">
      <RevenueCard
        title="Revenue"
        amount="₹90,000.00"
        date="Nov 01 – Nov 30"
        stats={{
          Store: "50,000",
          Membership: "10,0000",
          Event: "20,000",
          Space: "10,0000",
        }}
      />

      {/* Membership Details */}
      <RevenueCard
        title="Membership"
        amount="₹70,000.00"
        date="Nov 01 – Nov 30"
        stats={{
          Basic: "15,000",
          Weekly: "10,000",
          Monthly: "25,000",
          Yearly: "20,000",
        }}
      />

      {/* Networking Details */}
      <RevenueCard
        title="Network"
        amount="₹40,000.00"
        date="Nov 01 – Nov 30"
        stats={{
          Vendor: "10,000",
          Customer: "15,000",
          Partner: "8,000",
          Guest: "7,000",
        }}
      />
    </div>
  );
}
