# 词间漫游上线与更新

## Cloudflare Pages

线上地址为 [词间漫游](https://english-vocabulary-web-3d.pages.dev/)。

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

## Blender 地图

`art-source/map-references/` 的每张概念图按从左到右、从上到下排列四幕。`art-source/story-maps/` 中每个 `.blend` 含一个故事的四个场景和打包后的参考图和材质。网页版按章节加载 `assets/blender-maps/` 中的 GLB，离线版将它们嵌入 HTML。

从 `wordwander` 目录运行以下命令，用 Blender 5.3 重新生成地图。将示例路径换成本机路径。`gltfpack` 使用 [Meshoptimizer v0.18](https://github.com/zeux/meshoptimizer/releases/tag/v0.18)，用于生成更小的网页模型。

```powershell
$env:WORDWANDER_GLTFPACK = 'C:\Tools\gltfpack.exe'
& 'E:\Blender\blender.exe' -b --factory-startup --python-exit-code 13 --python art-source/create-story-maps.py
node build.mjs --web
node build.mjs
```

在 Blender 命令末尾加 `-- garden` 可只重建花园四幕。如已在 `.blend` 中手工编辑地图，保留该文件并在 Blender 中导出对应章节，勾选当前场景、自定义属性和动画。地图根对象携带出生点、碰撞边界和灯光数据。
