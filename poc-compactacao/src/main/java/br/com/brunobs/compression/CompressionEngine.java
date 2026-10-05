package br.com.brunobs.compression;

import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;

/** Stream-to-stream compression contract. Calls consume and close both streams. */
public interface CompressionEngine {
    CompressionResult compress(InputStream source, OutputStream destination, int level, int bufferSize)
            throws IOException;

    DecompressionResult decompress(InputStream source, OutputStream destination, int bufferSize)
            throws IOException;

    record CompressionResult(long originalBytes, long compressedBytes, long elapsedNanos) { }
    record DecompressionResult(long compressedBytes, long decompressedBytes, long elapsedNanos) { }
}
