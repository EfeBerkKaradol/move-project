package com.tasiyoruz.api.shared.error;

import java.util.stream.Collectors;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.HttpStatusCode;
import org.springframework.http.ProblemDetail;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.context.request.WebRequest;
import org.springframework.web.multipart.MaxUploadSizeExceededException;
import org.springframework.web.servlet.mvc.method.annotation.ResponseEntityExceptionHandler;

/**
 * Doğrulama hatalarını kullanıcıya gösterilebilir hâle getirir.
 *
 * <p>Spring'in varsayılan yanıtı "Validation failed for object='...'. Error count: 1"
 * diyor; alan mesajları yalnızca {@code errors} dizisinde. Web arayüzü tek bir metin
 * gösterdiği için kullanıcı, plakasının neden reddedildiğini hiç öğrenemiyordu.
 * Burada alan mesajları birleştirilip {@code detail} alanına yazılıyor.
 */
@RestControllerAdvice
class ValidationErrorHandler extends ResponseEntityExceptionHandler {

    @Override
    protected ResponseEntity<Object> handleMethodArgumentNotValid(
            MethodArgumentNotValidException ex, HttpHeaders headers, HttpStatusCode status, WebRequest request) {

        var detail = ex.getBindingResult().getAllErrors().stream()
                .map(e -> e.getDefaultMessage() == null ? "Geçersiz değer" : e.getDefaultMessage())
                .distinct()
                .collect(Collectors.joining(" · "));

        var problem = ProblemDetail.forStatusAndDetail(HttpStatus.BAD_REQUEST,
                detail.isBlank() ? "Gönderilen bilgiler geçersiz." : detail);
        problem.setTitle("Geçersiz istek");
        return ResponseEntity.badRequest().body(problem);
    }

    /**
     * Sunucu sınırı politikanınkinden büyük; buraya düşen istek gerçekten çok büyük.
     * Varsayılan yanıtta kullanıcıya gösterilebilir bir açıklama yok.
     */
    @Override
    protected ResponseEntity<Object> handleMaxUploadSizeExceededException(
            MaxUploadSizeExceededException ex, HttpHeaders headers, HttpStatusCode status, WebRequest request) {
        var problem = ProblemDetail.forStatusAndDetail(HttpStatus.PAYLOAD_TOO_LARGE,
                "Dosya çok büyük. Fotoğrafı küçültüp tekrar deneyin.");
        problem.setTitle("Dosya çok büyük");
        return ResponseEntity.status(HttpStatus.PAYLOAD_TOO_LARGE).body(problem);
    }
}
