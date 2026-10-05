package br.com.brunobs.compression;

import com.github.luben.zstd.ZstdInputStream;
import com.github.luben.zstd.ZstdOutputStream;

import java.io.BufferedInputStream;
import java.io.BufferedOutputStream;
import java.io.FilterInputStream;
import java.io.FilterOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.util.Objects;

public final class ZstdCompressionEngine implements CompressionEngine {
    private static final int COPY_BUFFER_SIZE = 16 * 1024;

    @Override
    public CompressionResult compress(InputStream source, OutputStream destination, int level, int bufferSize)
            throws IOException {
        validate(source, destination, bufferSize);
        CountingInputStream countedSource = new CountingInputStream(new BufferedInputStream(source, bufferSize));
        CountingOutputStream countedDestination = new CountingOutputStream(
                new BufferedOutputStream(destination, bufferSize));
        long started = System.nanoTime();
        try (countedSource; ZstdOutputStream compressed = new ZstdOutputStream(countedDestination, level)) {
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
        try (ZstdInputStream decompressed = new ZstdInputStream(countedSource);
             OutputStream output = countedDestination) {
            byte[] buffer = new byte[COPY_BUFFER_SIZE];
            int read;
            while ((read = decompressed.read(buffer)) != -1) {
                output.write(buffer, 0, read);
            }
        }
        return new DecompressionResult(countedSource.count, countedDestination.count,
                System.nanoTime() - started);
    }

    private static void validate(InputStream source, OutputStream destination, int bufferSize) {
        Objects.requireNonNull(source, "source");
        Objects.requireNonNull(destination, "destination");
        if (bufferSize < 1) {
            throw new IllegalArgumentException("bufferSize deve ser maior que zero.");
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
