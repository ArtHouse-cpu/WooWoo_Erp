import { createBrowserRouter } from "react-router-dom";
import AuthRoute from "@/routes/AuthRoute";
import GuestRoute from "@/routes/GuestRoute";
import { LoginScreen, OtpScreen, SignUpScreen } from "@/features/auth";
import { HomeScreen } from "@/features/home";
import { NotfoundScreen } from "@/features/common";
import {
  CreateNewMembershipScreen,
  CreateNewProductScreen,
  CreateNewServiceScreen,
  MembershipScreen,
  ProductScreen,
  ServiceScreen,
} from "@/features/catalogue";
import {
  ManagePlanScreen,
  MembersAndPartnersScreen,
} from "@/features/membership";
import {
  CustomerScreen,
  GuestScreen,
  PartnerScreen,
  VendorScreen,
} from "@/features/network";
import {
  CreatePurchaseReturnScreen,
  CreatePurchaseScreen,
  DebitNoteScreen,
  InventoryScreen,
  InventoryTimelineScreen,
  PurchaseOrderScreen,
} from "@/features/purchase";
import {
  CreateInvoiceScreen,
  CreatePosScreen,
  CreateSalesReturnScreen,
  CreditNoteScreen,
  InvoiceScreen,
  PaymentScreen,
  PosScreen,
  QuotationScreen,
  CouponsScreen,
} from "@/features/sales";
import CreateQuotationScreen from "@/features/sales/pages/CreateQuotationScreen";
import CreateSubscriptionScreen from "@/features/sales/pages/CreateSubscriptionScreen";
import SubscriptionScreen from "@/features/sales/pages/SubscriptionScreen";
import PurchaseScreen from "@/features/purchase/pages/PurchaseScreen";
import CreatePurchaseOrderScreen from "@/features/purchase/pages/CreatePurchaseOrderScreen";
import { WalletScreen } from "@/features/wallet";

export const router = createBrowserRouter([
  {
    path: "/",
    element: <AuthRoute />,
    children: [
      { index: true, element: <HomeScreen /> },
      { path: "/products", element: <ProductScreen /> },
      { path: "/services", element: <ServiceScreen /> },
      { path: "/membership", element: <MembershipScreen /> },
      { path: "/create-new-product", element: <CreateNewProductScreen /> },
      { path: "/create-new-service", element: <CreateNewServiceScreen /> },
      {
        path: "/create-new-membership",
        element: <CreateNewMembershipScreen />,
      },
      { path: "/vendors", element: <VendorScreen /> },
      { path: "/customers", element: <CustomerScreen /> },
      { path: "/partners", element: <PartnerScreen /> },
      { path: "/guests", element: <GuestScreen /> },
      { path: "/purchase", element: <PurchaseScreen/> },
      { path: "/purchase-orders", element: <PurchaseOrderScreen /> },
      { path: "/create-purchase", element: <CreatePurchaseScreen /> },
      { path: "/create-purchase-order", element: <CreatePurchaseOrderScreen /> },
      { path: "/create-purchase-return", element: <CreatePurchaseReturnScreen /> },
      
      { path: "/inventory", element: <InventoryScreen /> },
      { path: "/inventory-timeline", element: <InventoryTimelineScreen /> },
      { path: "/debit-notes", element: <DebitNoteScreen /> },
      { path: "/pos", element: <PosScreen /> },
      { path: "/subscriptions", element: <SubscriptionScreen /> },
      { path: "/invoices", element: <InvoiceScreen /> },
      { path: "/payments", element: <PaymentScreen /> },
      { path: "/wallet", element: <WalletScreen /> },
      { path: "/quotations", element: <QuotationScreen /> },
      { path: "/create-quotation", element: <CreateQuotationScreen /> },
      { path: "/creditnotes", element: <CreditNoteScreen /> },
      { path: "/create-pos", element: <CreatePosScreen /> },
      { path: "/create-invoice", element: <CreateInvoiceScreen /> },
      { path: "/create-sales-return", element: <CreateSalesReturnScreen /> },
      { path: "/create-subscription", element: <CreateSubscriptionScreen /> },
      { path: "/manage-plans", element: <ManagePlanScreen /> },
      { path: "/members-and-partners", element: <MembersAndPartnersScreen /> },
      { path: "/Vendor list", element: <VendorScreen /> },
      { path: "/coupons", element: <CouponsScreen /> },
    ],
  },
  {
    path: "/login",
    element: (
      <GuestRoute>
        <LoginScreen />
      </GuestRoute>
    ),
  },
  {
    path: "/signup",
    element: (
      <GuestRoute>
        <SignUpScreen />
      </GuestRoute>
    ),
  },
  {
    path: "/otp",
    element: <OtpScreen />,
  },
  { path: "*", element: <NotfoundScreen /> },
]);
