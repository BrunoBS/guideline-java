package br.com.brunobs.compression;

import java.io.BufferedInputStream;
import java.io.BufferedOutputStream;
import java.io.FilterInputStream;
import java.io.FilterOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.util.Objects;
import java.util.zip.GZIPInputStream;
import java.util.zip.GZIPOutputStream;

/** GZIP streaming engine; level maps to java.util.zip.Deflater levels 0 through 9. */
public final class GzipCompressionEngine implements CompressionEngine {
    private static final int COPY_BUFFER_SIZE = 16 * 1024;

    @Override
    public CompressionResult compress(InputStream source, OutputStream destination, int level, int bufferSize)
            throws IOException {
        validate(source, destination, bufferSize);
        if (level < 0 || level > 9) {
            throw new IllegalArgumentException("O nível GZIP deve estar entre 0 e 9.");
        }

        CountingInputStream countedSource = new CountingInputStream(new BufferedInputStream(source, bufferSize));
        CountingOutputStream countedDestination = new CountingOutputStream(
                new BufferedOutputStream(destination, bufferSize));
        long started = System.nanoTime();
        try (countedSource; GZIPOutputStream compressed =
                new LevelGzipOutputStream(countedDestination, bufferSize, level)) {
            countedSource.transferTo(compressed);
        }
        return new CompressionResult(countedSource.count, countedDestination.count, System.nanoTime() - started);
    }

    @Override
    public DecompressionResult decompress(InputStream source, OutputStream destination, int bufferSize)
            throws IOException {
        validate(source, destination, bufferSize);
        CountingInputStream countedSource = new CountingInputStream(new BufferedInputStream(source, bufferSize));
        CountingOutputStream countedDestination = new CountingOutputStream(
                new BufferedOutputStream(destination, bufferSize));
        long started = System.nanoTime();
        try (GZIPInputStream decompressed = new GZIPInputStream(countedSource, bufferSize);
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

    private static final class LevelGzipOutputStream extends GZIPOutputStream {
        private LevelGzipOutputStream(OutputStream output, int bufferSize, int level) throws IOException {
            super(output, bufferSize);
            def.setLevel(level);
        }
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
