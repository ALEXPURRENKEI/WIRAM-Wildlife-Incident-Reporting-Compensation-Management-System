package com.wiram.backend.exception;

import com.wiram.backend.dto.ApiErrorResponse;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.List;
import java.util.stream.Collectors;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.ConstraintViolationException;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.FieldError;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;

@RestControllerAdvice
public class GlobalExceptionHandler {

  @ExceptionHandler(ApiException.class)
  public ResponseEntity<ApiErrorResponse> handleApiException(
      ApiException ex, HttpServletRequest request) {
    return buildResponse(ex.getStatus(), ex.getStatus().getReasonPhrase(), ex.getMessage(), request, List.of());
  }

  @ExceptionHandler(MethodArgumentNotValidException.class)
  public ResponseEntity<ApiErrorResponse> handleValidationException(
      MethodArgumentNotValidException ex, HttpServletRequest request) {
    List<String> details =
        ex.getBindingResult().getFieldErrors().stream()
            .map(this::formatFieldError)
            .collect(Collectors.toList());
    return buildResponse(
        HttpStatus.BAD_REQUEST,
        "Validation failed",
        "One or more fields are invalid.",
        request,
        details);
  }

  @ExceptionHandler(ConstraintViolationException.class)
  public ResponseEntity<ApiErrorResponse> handleConstraintViolationException(
      ConstraintViolationException ex, HttpServletRequest request) {
    List<String> details =
        ex.getConstraintViolations().stream()
            .map(violation -> violation.getPropertyPath() + ": " + violation.getMessage())
            .collect(Collectors.toList());
    return buildResponse(
        HttpStatus.BAD_REQUEST,
        "Validation failed",
        "One or more fields are invalid.",
        request,
        details);
  }

  @ExceptionHandler(MethodArgumentTypeMismatchException.class)
  public ResponseEntity<ApiErrorResponse> handleTypeMismatch(
      MethodArgumentTypeMismatchException ex, HttpServletRequest request) {
    return buildResponse(
        HttpStatus.BAD_REQUEST,
        "Invalid request parameter",
        "A request parameter has an invalid value.",
        request,
        List.of(ex.getName() + ": " + ex.getValue()));
  }

  @ExceptionHandler(HttpMessageNotReadableException.class)
  public ResponseEntity<ApiErrorResponse> handleUnreadableMessage(
      HttpMessageNotReadableException ex, HttpServletRequest request) {
    return buildResponse(
        HttpStatus.BAD_REQUEST,
        "Malformed request",
        "The request body could not be parsed.",
        request,
        List.of());
  }

  @ExceptionHandler(DataIntegrityViolationException.class)
  public ResponseEntity<ApiErrorResponse> handleDataIntegrityViolation(
      DataIntegrityViolationException ex, HttpServletRequest request) {
    return buildResponse(
        HttpStatus.CONFLICT,
        "Data integrity violation",
        "The operation could not be completed because of a database constraint.",
        request,
        List.of());
  }

  @ExceptionHandler(Exception.class)
  public ResponseEntity<ApiErrorResponse> handleUnexpectedException(
      Exception ex, HttpServletRequest request) {
    return buildResponse(
        HttpStatus.INTERNAL_SERVER_ERROR,
        "Internal server error",
        "An unexpected error occurred.",
        request,
        List.of());
  }

  private ResponseEntity<ApiErrorResponse> buildResponse(
      HttpStatus status,
      String error,
      String message,
      HttpServletRequest request,
      List<String> details) {
    ApiErrorResponse body =
        new ApiErrorResponse(
            OffsetDateTime.now(ZoneOffset.UTC),
            status.value(),
            error,
            message,
            request == null ? null : request.getRequestURI(),
            details == null ? List.of() : details);
    return ResponseEntity.status(status).body(body);
  }

  private String formatFieldError(FieldError fieldError) {
    return fieldError.getField() + ": " + fieldError.getDefaultMessage();
  }
}
