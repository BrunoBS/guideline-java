package br.com.brunobs.compression;

public enum CompressionAlgorithm {
    ZSTD("zstd", "level", 1, new ZstdCompressionEngine()),
    GZIP("gzip", "level", 6, new GzipCompressionEngine()),
    BROTLI("brotli", "quality", 5, new BrotliCompressionEngine()),
    XZ("xz", "preset", 6, new XzCompressionEngine());

    private final String commandName;
    private final String settingName;
    private final int defaultSetting;
    private final CompressionEngine engine;

    CompressionAlgorithm(String commandName, String settingName, int defaultSetting, CompressionEngine engine) {
        this.commandName = commandName;
        this.settingName = settingName;
        this.defaultSetting = defaultSetting;
        this.engine = engine;
    }

    public String commandName() { return commandName; }
    public String settingName() { return settingName; }
    public int defaultSetting() { return defaultSetting; }
    public CompressionEngine engine() { return engine; }

    public static CompressionAlgorithm fromCommand(String value) {
        if ("lzma".equalsIgnoreCase(value)) return XZ;
        for (CompressionAlgorithm algorithm : values()) {
            if (algorithm.commandName.equalsIgnoreCase(value)) return algorithm;
        }
        throw new IllegalArgumentException("Algoritmos aceitos: xz (LZMA2), zstd, gzip ou brotli.");
    }
}
