# 密码学算法可视化演示

本项目是纯 HTML、CSS 与 JavaScript 编写的交互式教学网页，共包含 14 个算法模块。

- 古典密码：凯撒、仿射、维吉尼亚、Playfair、Hill 2×2、周期置换、列置换、一次一密、三转轮教学模型
- 现代算法：AES-128、RSA、RC4、SHA-256、MD5

每个模块都会给出结果，并把关键中间状态拆成可播放、前进和后退的动画步骤。

## 目录与构建

`classical-cipher-lab/` 是唯一规范源目录；`dist/` 是由构建脚本生成的公开网页，不应直接手工修改。

在仓库根目录运行：

```powershell
npm run build
npm test
```

构建脚本只会清理仓库根目录下经过校验的 `dist/`，随后复制 `index.html`、`assets/` 和 `js/`。

## 启动

先运行 `npm run build`，再选择一种方式：

```powershell
npm run serve
```

浏览器访问 `http://127.0.0.1:4173/`。也可以双击 `classical-cipher-lab/启动网站.bat`，该启动器会自动打开浏览器。若 4173 端口已占用，可在 `classical-cipher-lab/` 中指定端口：

```powershell
$env:PORT=4180
node serve.mjs --open
```

## 现代算法输入格式

- AES-128：16 个 UTF-8 字节的密钥；教学模式为 ECB 与 PKCS#7；密文使用大写十六进制。
- RSA：输入素数 `p`、`q` 和公钥指数 `e`；明文按 UTF-8 字节处理；密文是空格分隔的十进制整数。
- RC4：密钥长度为 1–256 个 UTF-8 字节；密文使用大写十六进制。
- SHA-256：输入普通 UTF-8 文本，输出 64 个小写十六进制字符。
- MD5：输入普通 UTF-8 文本，输出 32 个小写十六进制字符。

教学界面将单次输入限制为 256 个 UTF-8 字节，以控制动画步骤数量。

## 安全说明

所有实现只用于理解算法结构，不用于真实安全通信。AES 的 ECB 模式会泄露数据模式；教材 RSA 未使用 OAEP；RC4 与 MD5 已不安全；SHA-256 是哈希函数而不是可解密的加密算法。
