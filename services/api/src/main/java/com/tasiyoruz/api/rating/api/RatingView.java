package com.tasiyoruz.api.rating.api;

import java.time.Instant;

public record RatingView(String id, String tripId, String carrierId, int score, String comment, Instant createdAt) {}
