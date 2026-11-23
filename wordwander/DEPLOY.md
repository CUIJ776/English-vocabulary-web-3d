# 词间漫游上线与更新

## Cloudflare Pages

将现有的 `CUIJ776/English-vocabulary-web-3d` 仓库连接到 Cloudflare Pages。生产分支选 `main`，框架选无框架，根目录填 `wordwander`，构建命令填 `node build.mjs --web`，输出目录填 `dist-web`。构建环境使用 Node.js 22。页面、3D 场景、音乐、朗读和字体都从静态文件提供。

## 本地修改

从 `wordwander` 目录运行：

```powershell
powershell.exe -NoProfile -File .\generate-audio.ps1
node build.mjs --web
node server.mjs --web
```

在浏览器打开 `http://127.0.0.1:4173/`。音频脚本只合成新增或改写的英文句子，使用 Windows 的 Microsoft Zira Desktop 语音。校验完成后提交源码以及 `assets/speech/` 的变更，推送到 `main`，Cloudflare 会构建并发布到同一个网址。

执行 `node build.mjs` 可生成离线单文件版，双击上一级目录的 `雾灯来信.html` 即可打开。网页构建只复制仍被故事引用的录音。学习进度保存在各自浏览器和访问网址下。
