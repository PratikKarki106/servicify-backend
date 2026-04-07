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
  EMAIL_NOT_VERIFIED: "Please verify your email before logging in",

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


    // ✅ Forgot Password Flow
  EMAIL_REQUIRED: "Email address is required",
  PIN_REQUIRED: "PIN is required",
  NEW_PASSWORD_REQUIRED: "New password is required",
  CONFIRM_PASSWORD_REQUIRED: "Please confirm your new password",
  PASSWORDS_DONT_MATCH: "Passwords do not match",
  
  // PIN/OTP related
  PIN_SENT: "PIN has been sent to your email", // Success message
  PIN_INVALID: "Invalid PIN",
  PIN_EXPIRED: "PIN has expired. Please request a new one",
  PIN_MAX_ATTEMPTS: "Too many incorrect attempts. Please request a new PIN",
  NO_PIN_REQUESTED: "No PIN requested for this email",
  PIN_ALREADY_VERIFIED: "PIN has already been verified",
  PIN_RESEND_SUCCESS: "New PIN sent successfully",
  PIN_RESEND_LIMIT: "Please wait before requesting another PIN",
  
  // Reset token related
  RESET_TOKEN_REQUIRED: "Reset token is required",
  RESET_TOKEN_INVALID: "Invalid or expired reset token",
  RESET_TOKEN_MISSING: "Reset token is missing",
  
  // Password validation
  PASSWORD_SAME_AS_OLD: "New password cannot be same as old password",
  PASSWORD_RESET_SUCCESS: "Password reset successful",
  PASSWORD_RESET_FAILED: "Failed to reset password",
  
  // Rate limiting
  TOO_MANY_REQUESTS: "Too many requests. Please try again later",
  EMAIL_LIMIT_EXCEEDED: "Too many PIN requests for this email",
  
  // Email related
  EMAIL_SEND_FAILED: "Failed to send email. Please try again",
  EMAIL_NOT_REGISTERED: "If an account exists, a PIN will be sent", // Security: don't reveal if email exists
  
  // Session/Flow related
  RESET_SESSION_EXPIRED: "Password reset session expired. Please start over",
  INVALID_RESET_FLOW: "Invalid password reset flow. Please start from beginning",

    VEHICLE_NOT_FOUND: "Vehicle not found",
  VEHICLE_EXISTS: "Vehicle with this plate number already exists",
  PLATE_NUMBER_EXISTS: "Another vehicle with this plate number already exists",
  VEHICLE_ADDED: "Vehicle added successfully",
  VEHICLE_UPDATED: "Vehicle updated successfully",
  VEHICLE_DELETED: "Vehicle deleted successfully",
  VEHICLE_FETCH_FAILED: "Failed to fetch vehicles",
  VEHICLE_FETCH_SINGLE_FAILED: "Failed to fetch vehicle details",
  VEHICLE_CREATE_FAILED: "Failed to create vehicle",
  VEHICLE_UPDATE_FAILED: "Failed to update vehicle",
  VEHICLE_DELETE_FAILED: "Failed to delete vehicle",
  
  // Vehicle Validation
  VEHICLE_NAME_REQUIRED: "Vehicle name is required",
  VEHICLE_COLOR_REQUIRED: "Vehicle color is required",
  VEHICLE_VERSION_REQUIRED: "Vehicle version/model is required",
  VEHICLE_PLATE_NUMBER_REQUIRED: "Vehicle plate number is required",
  VEHICLE_MILEAGE_REQUIRED: "Vehicle mileage is required",
  INVALID_PLATE_NUMBER_FORMAT: "Invalid plate number format",
  INVALID_MILEAGE: "Mileage must be a positive number",
  INVALID_LAST_SERVICE_DATE: "Last service date cannot be in the future",
  INVALID_NEXT_SERVICE_DATE: "Next service date must be after last service date",
  
  // Vehicle Ownership
  VEHICLE_UNAUTHORIZED_ACCESS: "You don't have permission to access this vehicle",
  VEHICLE_UNAUTHORIZED_UPDATE: "You don't have permission to update this vehicle",
  VEHICLE_UNAUTHORIZED_DELETE: "You don't have permission to delete this vehicle",
  
  // Vehicle Service
  SERVICE_REMINDER_SET_FAILED: "Failed to set service reminder",
  SERVICE_HISTORY_FETCH_FAILED: "Failed to fetch service history",
  VEHICLE_SERVICE_OVERDUE: "Vehicle service is overdue",
  VEHICLE_SERVICE_DUE_SOON: "Vehicle service due soon",
};

export default errorMessages;