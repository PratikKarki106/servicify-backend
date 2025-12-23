// middleware/errorHandler.js
import errorMessages from "../utils/errorMessages.js";

export default function errorHandler(err, req, res, next) {
  console.error(err.stack);

  // If the error already has a status code, use it; otherwise default to 500
  const statusCode = err.statusCode || 500;

  // If the error has a message, use it; otherwise fallback to SERVER_ERROR
  const message = err.message || errorMessages.SERVER_ERROR;

  res.status(statusCode).json({ error: message });
}