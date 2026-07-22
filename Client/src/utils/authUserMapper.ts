/**
 * Map login / signup / OTP API user payload into Redux loginSuccess shape.
 * Includes access_module (permissions) from Step 4 RBAC.
 */
export function mapAuthUserToReduxPayload(user: any) {
  return {
    m_staff_id: user?.m_staff_id ?? null,
    m_staff_name: user?.fullName ?? null,
    m_staff_mobile: user?.phoneNumber ?? null,
    m_staff_email: user?.email ?? null,
    m_staff_role: user?.rbacRole?.slug || user?.role || null,
    access_module: user?.access_module || user?.permissions || [],
    alternateMobile: user?.AlternateMobile ?? null,
    whatsappNumber: user?.whatsappNumber ?? null,
    address: user?.address ?? null,
    city: user?.city ?? null,
    state: user?.state ?? null,
    country: user?.country ?? null,
    pincode: user?.pincode ?? null,
    companyName: user?.companyName ?? null,
    gstin: user?.gstin ?? null,
    adharNumber: user?.adharNumber ?? null,
    gender: user?.gender ?? null,
    dob: user?.dob ?? null,
    membershipType: user?.membershipType ?? null,
    createdAt: user?.createdAt ?? null,
    companies: user?.companies,
    activeCompany: user?.activeCompany ?? null,
  };
}
