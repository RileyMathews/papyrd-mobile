declare module "spark-md5" {
  class SparkMD5ArrayBuffer {
    append(value: ArrayBuffer): SparkMD5ArrayBuffer;
    end(): string;
  }

  const SparkMD5: {
    hash(value: string): string;
    ArrayBuffer: {
      new (): SparkMD5ArrayBuffer;
      hash(value: ArrayBuffer): string;
    };
  };

  export default SparkMD5;
}
