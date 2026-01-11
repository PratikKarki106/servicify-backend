// utils/errorMessages.js

const errorMessages = {
  // ✅ Authentication & Authorization
  USER_EXISTS: "User already exists",
  INVALID_CREDENTIALS: "Invalid email or password",
  UNAUTHORIZED: "You are not authorized to perform this action",
  TOKEN_MISSING: "Authentication token is missing",
  TOKEN_INVALID: "Authentication token is invalid or expired",
  SESSION_EXPIRED: "Your session has expired, please log in again",
  USER_NOT_FOUND: "User does not exist",

  // ✅ Signup & Login
  SIGNUP_FAILED: "Signup failed due to an unexpected error",
  LOGIN_FAILED: "Login failed due to an unexpected error",
  PASSWORD_TOO_SHORT: "Password must be at least 8 characters long",
  PASSWORD_WEAK: "Password must contain uppercase, lowercase, number, and symbol",

  // ✅ Validation
  MISSING_FIELDS: "Please fill in all required fields",
  INVALID_EMAIL: "Email format is invalid",
  INVALID_INPUT: "One or more fields contain invalid data",

  // ✅ Database
  DB_CONNECTION_FAILED: "Failed to connect to the database",
  DB_QUERY_FAILED: "Database query failed",
  USER_NOT_FOUND: "User not found",
  DUPLICATE_KEY: "Duplicate entry detected in database",

  // ✅ Server/System
  SERVER_ERROR: "Something went wrong. Please try again later",
  ROUTE_NOT_FOUND: "Requested route does not exist",
  SERVICE_UNAVAILABLE: "Service temporarily unavailable",

  GOOGLE_ACCOUNT_LOGIN: "This account was created with Google. Please login using Google.",

  // ✅ Appointment Booking
  APPOINTMENT_FAILED: "Failed to book appointment due to an unexpected error",
  APPOINTMENT_NOT_FOUND: "Appointment not found",
  APPOINTMENT_ALREADY_EXISTS: "You already have an appointment at this time",
  INVALID_SERVICE_TYPE: "Selected service type is invalid",
  INVALID_DATE: "Selected date is invalid or in the past",
  INVALID_TIME: "Selected time is invalid or unavailable",
  SLOT_UNAVAILABLE: "The chosen time slot is already booked",
  VEHICLE_INFO_MISSING: "Vehicle information is required to book an appointment",
  PICKUP_ADDRESS_REQUIRED: "Pickup address is required when pickup service is selected",
  IMAGE_UPLOAD_FAILED: "Failed to upload vehicle image",
  CANCEL_FAILED: "Failed to cancel appointment",
  UPDATE_FAILED: "Failed to update appointment details",

  // Package Management
  PACKAGE_NOT_FOUND: "Package not found",
  PACKAGE_ALREADY_EXISTS: "Package with this name already exists",
  PACKAGE_CREATION_FAILED: "Failed to create package",
  PACKAGE_UPDATE_FAILED: "Failed to update package",
  PACKAGE_DELETE_FAILED: "Failed to delete package",
  PACKAGE_EXPIRED: "This package is no longer available for purchase",
  PACKAGE_INACTIVE: "This package is currently inactive",
  PACKAGE_PURCHASE_FAILED: "Failed to purchase package",
  PACKAGE_ALREADY_PURCHASED: "You have already purchased this package",
  PACKAGE_NO_CREDITS: "No service credits remaining in this package",
  INVALID_PURCHASE_DATE: "Purchase date cannot be in the future",
  INVALID_EXPIRY_DATE: "Expiry date must be in the future",
  INVALID_SERVICE_COUNT: "Service count must be at least 1",
  INVALID_PRICE: "Price must be greater than 0",
  PACKAGE_PURCHASE_DEADLINE_PASSED: "Purchase deadline has passed for this package",
  MAX_PURCHASE_LIMIT_REACHED: "Maximum purchase limit reached for this package",
  INSUFFICIENT_CREDITS: "Insufficient service credits to book this service",

  USER_PACKAGE_NOT_FOUND: "User package not found",
  USER_PACKAGE_EXPIRED: "Your package has expired",
  SERVICE_CREDIT_USAGE_FAILED: "Failed to use service credit",
  CREDIT_REFUND_FAILED: "Failed to refund service credit",
};

export default errorMessages;