package br.com.brunobs.compression;

import com.aayushatharva.brotli4j.Brotli4jLoader;
import com.aayushatharva.brotli4j.decoder.BrotliInputStream;
import com.aayushatharva.brotli4j.encoder.BrotliOutputStream;
import com.aayushatharva.brotli4j.encoder.Encoder;

import java.io.BufferedInputStream;
import java.io.BufferedOutputStream;
import java.io.FilterInputStream;
import java.io.FilterOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.util.Objects;

/** Brotli streaming engine; level maps to Brotli quality 0 through 11. */
public final class BrotliCompressionEngine implements CompressionEngine {
    private static final int COPY_BUFFER_SIZE = 16 * 1024;
    private static final int WINDOW_LOG = 22;

    @Override
    public CompressionResult compress(InputStream source, OutputStream destination, int level, int bufferSize)
            throws IOException {
        validate(source, destination, bufferSize);
        if (level < 0 || level > 11) {
            throw new IllegalArgumentException("A qualidade Brotli deve estar entre 0 e 11.");
        }
        Brotli4jLoader.ensureAvailability();
        Encoder.Parameters parameters = Encoder.Parameters.create(level, WINDOW_LOG, Encoder.Mode.TEXT);

        CountingInputStream countedSource = new CountingInputStream(new BufferedInputStream(source, bufferSize));
        CountingOutputStream countedDestination = new CountingOutputStream(
                new BufferedOutputStream(destination, bufferSize));
        long started = System.nanoTime();
        try (countedSource; BrotliOutputStream compressed =
                new BrotliOutputStream(countedDestination, parameters, bufferSize)) {
            countedSource.transferTo(compressed);
        }
        return new CompressionResult(countedSource.count, countedDestination.count, System.nanoTime() - started);
    }

    @Override
    public DecompressionResult decompress(InputStream source, OutputStream destination, int bufferSize)
            throws IOException {
        validate(source, destination, bufferSize);
        Brotli4jLoader.ensureAvailability();
        CountingInputStream countedSource = new CountingInputStream(new BufferedInputStream(source, bufferSize));
        CountingOutputStream countedDestination = new CountingOutputStream(
                new BufferedOutputStream(destination, bufferSize));
        long started = System.nanoTime();
        try (BrotliInputStream decompressed = new BrotliInputStream(countedSource, bufferSize);
             OutputStream output = countedDestination) {
            copy(decompressed, output);
        }
        return new DecompressionResult(countedSource.count, countedDestination.count,
                System.nanoTime() - started);
    }

    private static void copy(InputStream input, OutputStream output) throws IOException {
        byte[] buffer = new byte[COPY_BUFFER_SIZE];
        int read;
        while ((read = input.read(buffer)) != -1) output.write(buffer, 0, read);
    }

    private static void validate(InputStream source, OutputStream destination, int bufferSize) {
        Objects.requireNonNull(source, "source");
        Objects.requireNonNull(destination, "destination");
        if (bufferSize < 1) throw new IllegalArgumentException("bufferSize deve ser maior que zero.");
    }

    private static final class CountingInputStream extends FilterInputStream {
        private long count;
        private CountingInputStream(InputStream input) { super(input); }
        @Override public int read() throws IOException {
            int value = super.read();
            if (value != -1) count++;
            return value;
        }
        @Override public int read(byte[] bytes, int offset, int length) throws IOException {
            int read = super.read(bytes, offset, length);
            if (read > 0) count += read;
            return read;
        }
    }

    private static final class CountingOutputStream extends FilterOutputStream {
        private long count;
        private CountingOutputStream(OutputStream output) { super(output); }
        @Override public void write(int value) throws IOException {
            out.write(value);
            count++;
        }
        @Override public void write(byte[] bytes, int offset, int length) throws IOException {
            out.write(bytes, offset, length);
            count += length;
        }
    }
}
