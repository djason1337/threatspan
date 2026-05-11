class Threatspan < Formula
  desc "Keyboard-first IOC investigation workspace for SOC analysts"
  homepage "https://github.com/djason1337/threatspan"
  url "https://registry.npmjs.org/threatspan/-/threatspan-1.0.11.tgz"
  sha256 "REPLACE_WITH_SHA256_OF_NPM_TARBALL"
  license "MIT"

  depends_on "node"

  def install
    system "npm", "install", *std_npm_args
    bin.install_symlink Dir["#{libexec}/bin/*"]
  end

  test do
    assert_match version.to_s, shell_output("#{bin}/threatspan --version")
  end
end
