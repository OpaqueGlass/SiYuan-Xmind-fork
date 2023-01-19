<script setup lang="ts">
import { ref, Ref } from "vue";
import { getSiYuanBlock, sqlRequest, getNearbyListBlock, getSettings, saveSettings} from "./lib/SiYuan";
import { ListFile, save_xmind, outlineScope, ListNodeParser } from "./lib/M3Creator";
import { Transformer } from "markmap-lib";
import * as markmap from "markmap-view";


const tip = ref("转换并预览");
const mode: Ref<string> = ref("nearby_list_block");
const outlineMin = ref(1);
const outlineMax = ref(6);
const refreshing: Ref<any> = ref(undefined);

let markdown: string = ""
let CurrentMarkmap: markmap.Markmap
let g_settings: any;
// 深色模式
let g_darkMode: boolean = false;
// 读取挂件属性

// 载入预处理 !部分元素未载入，请之后处理
init();
async function init() {
  // 环境检查
  try{
    // @ts-ignore
    if (window.top.siyuan.config.appearance.mode == 1) {
      // 设置暗色模式
      document.documentElement.setAttribute('theme-mode', 'dark');
      g_darkMode = true;
    }
  }catch(err) {
    console.error(err);
  }
  
  let justCreated: boolean = false;
  try {
    g_settings = await getSettings();
  }catch(err) {

  }
  if ("id" in g_settings) {
    if ("custom-notemapmode" in g_settings) mode.value = g_settings["custom-notemapmode"];
  }else{
    justCreated = true;
  }
  
  if (mode.value == "nearby_list_block") {
    ExportToXmind();
  }else if (justCreated == false) {
    ExportToXmind();
  }
}

async function ExportToXmind(byClick:boolean = false) {
  // 刷新中禁用按钮
  refreshing.value = true;
  markdown = "";
  let { id, box, path, name } = await getSiYuanBlock();
  // 区分模式
  if (mode.value == "nearby_list_block") {
    let nextId = getNearbyListBlock();
    console.log(nextId)
    markdown = await ListNodeParser(nextId);
  }else{
    console.log(`id: ${id}, box: ${box}, path: ${path}`);
    tip.value = `正在转换...`;
    markdown += `${name}\n`;
    console.log("用户选择模式", mode.value);
    outlineScope[0] = outlineMin.value;
    outlineScope[1] = outlineMax.value;
    console.log("大纲范围选择", outlineScope);
    markdown += await ListFile(box, path, mode.value);

  }
  tip.value = `完成！`;
  console.log(markdown);
  setTimeout(() => {tip.value = "更新"}, 3000)

  const transformer = new Transformer();

  // 1. transform markdown
  const { root, features } = transformer.transform("# " + markdown);

  // 2. get assets
  // either get assets required by used features
  const { styles, scripts } = transformer.getUsedAssets(features);
  const { Markmap, loadCSS, loadJS } = markmap;

  // 1. load assets
  if (styles) loadCSS(styles);
  if (scripts) loadJS(scripts, { getMarkmap: () => markmap });
  // 2. create markmap
  // `options` is optional, i.e. `undefined` can be passed here
  console.log(document.getElementById("markmap"));
  let tempElem = document.getElementById("markmap");
  if (tempElem != null && tempElem != undefined) {
    tempElem.innerHTML = "";
  }
  
  CurrentMarkmap = Markmap.create("#markmap", undefined, root);
  // 处理导图预览深夜模式
  if (g_darkMode) {
    document.getElementById("markmap")?.classList.add("notemap_dark");
  }
  // if (CurrentMarkmap) {
  //   let tempElem = document.getElementById("markmap");
  //   if (tempElem != null && tempElem != undefined) {
  //     tempElem.innerHTML = "";
  //   }
  //   CurrentMarkmap = Markmap.create("#markmap", undefined, root);
  // } else {
  //   CurrentMarkmap = Markmap.create("#markmap", undefined, root);
  // }

  // TODO: 设置挂件属性
  if (byClick) {
    g_settings = {};
    g_settings["custom-notemapmode"] = mode.value;
    console.log("savesettings", g_settings);
    saveSettings(g_settings);
  }
  refreshing.value = undefined;
}

async function SaveXmind() {
  save_xmind(markdown)
}
// REFER:https://stackoverflow.com/questions/60921718/save-generated-svg-with-svg-js-as-svg-file
async function SaveSvg() {
  let text:any = document.getElementById("markmap")?.innerHTML;
  text = `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" xmlns:svgjs="http://svgjs.dev/svgjs" id="markmap" style="width: 100vw; height: 90vh;" class="mm-ip319j-1" version="1.1">${text}</svg>`
  let fileName = "result.svg";
  let fileType = "image/svg";
  console.log(text);
  var blob = new Blob([text], { type: fileType });

  var a = document.createElement('a');
  a.download = fileName;
  a.href = URL.createObjectURL(blob);
  a.dataset.downloadurl = [fileType, a.download, a.href].join(':');
  a.style.display = "none";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(function() { URL.revokeObjectURL(a.href); }, 1500);
}

/**
 * 可视区域保存为png（全部显示时图片模糊）
 */
function SavePng() {
  let node:any = document.getElementById("markmap");
  let name = "result";
  let width:any = document.getElementById("markmap")?.scrollWidth;
  let height:any = document.getElementById("markmap")?.scrollHeight;
  let type = "png";
  let serializer = new XMLSerializer()
  let source = '<?xml version="1.0" standalone="no"?>\r\n' + serializer.serializeToString(node);
  let image = new Image()
  let canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  let context:any = canvas.getContext('2d')
  // context.fillStyle = '#fff'
  // context.fillRect(0, 0, 10000, 10000)
  image.onload = function () {
    context.drawImage(image, 0, 0)
    let a = document.createElement('a')
    a.download = `${name}.${type}`
    a.href = canvas.toDataURL(`image/${type}`)
    a.click()
  }
  image.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(source)
}
</script>

<template>
  <div style="max-height:80px">
    
    <div style="display: flex; max-width:580px;align: center;  margin: auto; ">
      <t-button
          :style="{
            margin: 'auto',
            display: 'block',
          }"
          @click="ExportToXmind(true)"
          :disabled="refreshing"
          theme="primary"
        >{{ tip }}</t-button>
        <t-button
          :style="{
            margin: 'auto',
            display: 'block',
          }"
          @click="SaveXmind"
          theme="primary"
        >另存为xmind</t-button>
        <t-button
          :style="{
            margin: 'auto',
            display: 'block',
          }"
          @click="SavePng"
          theme="primary"
        >另存为PNG</t-button>
    </div>
    <div style="display: flex; align: center; width: 580px;margin: auto;" >
       <t-select :style="{
          display: 'block',
          width: '300px'
        }" v-model="mode">
          <t-option key="this_doc_only" label="仅当前文档大纲" value="this_doc_only">仅当前文档大纲</t-option>
          <t-option key="with_child_doc" label="当前文档及子文档" value="with_child_doc">当前文档及子文档</t-option>
          <t-option key="with_child_doc_outline" label="当前文档、子文档及子文档大纲" value="with_child_doc_outline">当前文档、子文档及子文档大纲</t-option>
          <t-option key="nearby_list_block" label="挂件下方的列表" value="nearby_list_block">挂件下方的列表</t-option>
        </t-select>
        <t-input-number style="width: 140px" v-model="outlineMin" :min="1" :max="6" label="大纲开始于" theme="column"></t-input-number>
        <t-input-number style="width: 140px" v-model="outlineMax" :min="1" :max="6" label="大纲结束于" theme="column"></t-input-number>
    </div>
    <svg id="markmap" style="width: 90vw; height: 85vh" />
  </div>
  
</template>

<style>
  .notemap_dark {
    color: white !important;
  }
</style>
