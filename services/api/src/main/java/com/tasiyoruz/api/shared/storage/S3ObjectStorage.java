package com.tasiyoruz.api.shared.storage;

import java.io.InputStream;
import java.net.URI;
import java.util.Optional;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import software.amazon.awssdk.auth.credentials.AwsBasicCredentials;
import software.amazon.awssdk.auth.credentials.StaticCredentialsProvider;
import software.amazon.awssdk.core.sync.RequestBody;
import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.*;

/** S3 uyumlu depo sürücüsü (yerelde MinIO). */
class S3ObjectStorage implements ObjectStorage {

    private static final Logger log = LoggerFactory.getLogger(S3ObjectStorage.class);

    private final S3Client client;
    private final String bucket;

    S3ObjectStorage(StorageProperties props) {
        var builder = S3Client.builder()
                .region(Region.of(props.region()))
                .credentialsProvider(StaticCredentialsProvider.create(
                        AwsBasicCredentials.create(props.accessKey(), props.secretKey())))
                .forcePathStyle(props.pathStyle());
        if (props.endpoint() != null && !props.endpoint().isBlank()) {
            builder.endpointOverride(URI.create(props.endpoint()));
        }
        this.client = builder.build();
        this.bucket = props.bucket();
        if (props.createBucket()) ensureBucket();
    }

    private void ensureBucket() {
        try {
            client.headBucket(b -> b.bucket(bucket));
        } catch (S3Exception e) {
            // headBucket kova yoksa 404, erişim yoksa 403 döner; ikisi de aynı S3Exception
            try {
                client.createBucket(b -> b.bucket(bucket));
                log.info("Nesne deposu kovası oluşturuldu: {}", bucket);
            } catch (BucketAlreadyOwnedByYouException | BucketAlreadyExistsException ignored) {
                // Başka bir örnek bizden önce oluşturmuş
            }
        }
    }

    @Override
    public void put(String key, String contentType, long size, InputStream content) {
        client.putObject(
                PutObjectRequest.builder().bucket(bucket).key(key).contentType(contentType).build(),
                RequestBody.fromInputStream(content, size));
    }

    @Override
    public Optional<StoredObject> get(String key) {
        try {
            var response = client.getObject(GetObjectRequest.builder().bucket(bucket).key(key).build());
            var meta = response.response();
            return Optional.of(new StoredObject(response, meta.contentType(), meta.contentLength()));
        } catch (NoSuchKeyException e) {
            return Optional.empty();
        }
    }

    @Override
    public void delete(String key) {
        client.deleteObject(DeleteObjectRequest.builder().bucket(bucket).key(key).build());
    }
}
