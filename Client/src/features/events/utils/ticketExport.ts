import * as XLSX from "xlsx";
import type { EventAttendee, EventOrder } from "../types/eventTypes";
import { formatInr } from "./eventHelpers";

export const exportAttendeesToCsv = (attendees: EventAttendee[], filename = "Attendees_List.xlsx") => {
  const data = attendees.map((a, index) => ({
    "S.No": index + 1,
    "Attendee Name": a.name,
    "Email": a.email,
    "Phone": a.phone,
    "Event": a.eventName,
    "Ticket Type": a.ticketTypeName,
    "Seat Number": a.seatNumber || "General",
    "Pass Code": a.passCode,
    "Registration Date": new Date(a.registrationDate).toLocaleDateString("en-IN"),
    "Check-In Status": a.checkInStatus === "CheckedIn" ? "Present" : "Not Checked In",
    "Checked-In At": a.checkedInAt ? new Date(a.checkedInAt).toLocaleString("en-IN") : "-",
    "Checked-In By": a.checkedInBy || "-",
  }));

  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Attendees");
  XLSX.writeFile(workbook, filename);
};

export const exportOrdersToCsv = (orders: EventOrder[], filename = "Event_Orders.xlsx") => {
  const data = orders.map((o, index) => ({
    "S.No": index + 1,
    "Order ID": o.orderNumber,
    "Customer": o.customerName,
    "Email": o.email,
    "Phone": o.phone,
    "Event": o.eventName,
    "Ticket Category": o.ticketCategory,
    "Qty": o.totalQuantity,
    "Subtotal (₹)": o.subtotal,
    "Discount (₹)": o.discountAmount,
    "Tax (₹)": o.taxAmount,
    "Total (₹)": o.totalAmount,
    "Payment Status": o.paymentStatus,
    "Payment Method": o.paymentMethod,
    "Booking Date": new Date(o.bookingDate).toLocaleDateString("en-IN"),
  }));

  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Orders");
  XLSX.writeFile(workbook, filename);
};
