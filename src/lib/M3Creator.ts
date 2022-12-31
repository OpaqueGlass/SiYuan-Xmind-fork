import { parseXMindMarkToXMindFile } from 'xmindmark'
import save from 'save-file'
import { listDocsByPath, getDocOutline, DocOutline } from './SiYuan'

// m3字符串的格式大概就是这样的
const xmindMarkFileContent = `
Central Topic
- Main Topic 1
- Main Topic 2
`

const indent = "    "

/**
 * 
 * @param notebook 
 * @param path 
 * @param mode this_doc_only 或 with_child_doc 或 with_child_doc_outline
 * @param index 
 * @returns 
 */
export async function ListFile(notebook: string, path: string, mode:string, index = 0): Promise<string> {
  let result = ""
  // 列出当前目录下的全部文件
  const docs = await listDocsByPath(path, notebook);
  if (mode !== "this_doc_only") {
    await docs.files.reduce(
      async (memo:any, file:any) => {
        let tempFileName = file.name;
        if (mode == "with_child_doc") tempFileName = tempFileName.substring(0, tempFileName.length - 3);
        result += `${indent.repeat(index)}- ${tempFileName.replaceAll("&nbsp;", " ")}\n`;
        if (mode == "with_child_doc_outline") {
          const outline : any = await getDocOutline(file.id)
          if (outline.length > 0) {
            result += ExtractOutline(outline, index + 1)
          }
        }
  
        if (file.subFileCount > 0) {
          result += await ListFile(notebook, file.path, mode, index + 1)
        }
      }, undefined
    );
  }
  
  if (result == "" && mode != "with_child_doc") {
    let dividedPath = path.split("/");
    let docid : any;
    if (dividedPath.length > 0) {
      docid = dividedPath[dividedPath.length - 1];
      docid = docid.substring(0, docid.length - 3);
    }
    const outline : any = await getDocOutline(docid);
    if (outline.length > 0) {
      result += ExtractOutline(outline, index);
    }
  }
  return result
}

function ExtractOutline(outlines: DocOutline[] | undefined | null, index: number): string {
  if (!outlines) {
    return ""
  }
  let result = ""
  outlines.map((outline:any) => {
    // 替换标题中的空格
    let content = outline.content;
    if (content != null || content != undefined) {
      content = content.replaceAll("&nbsp;", " ");
    }else{
      content = outline.name.replaceAll("&nbsp;", " ");
    }
    result += `${indent.repeat(index)}- ${content}\n`
    if (outline.type == "outline") {
      result += ExtractOutline(outline.blocks, index + 1)
    }else if (outline.type == "NodeHeading") {
      result += ExtractOutline(outline.children, index + 1);
    }
  })
  return result
}

export const save_xmind = async (str: string) => {
  const xmindArrayBuffer = await parseXMindMarkToXMindFile(str)
  await save(xmindArrayBuffer, 'result.xmind')
}
