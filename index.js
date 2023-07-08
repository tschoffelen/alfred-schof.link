import axios from "axios";
import { execa } from "execa";

const env = {
  LC_CTYPE: "UTF-8",
};

const getPng = async () => {
  try {
    const res = await execa(
      "osascript",
      ["-e", "get the clipboard as «class PNGf»"],
      { env }
    );
    const buf = Buffer.from(
      res.stdout.substring(10, res.stdout.length - 1),
      "hex"
    );
    return {
      type: "image/png",
      filename: "image.png",
      data: buf,
    };
  } catch (e) {
    return null;
  }
};

const getText = async () => {
  try {
    const res = await execa("pbpaste", { env });
    if (!res.stdout.length) {
      throw new Error("No text in clipboard");
    }
    if (res.stdout.match(/^https?:\/\//)) {
      return {
        type: "url",
        data: res.stdout,
      };
    }
    if (res.stdout.match(/^# /)) {
      return {
        type: "md",
        data: res.stdout,
      };
    }
    return {
      type: "text/plain",
      filename: "text.txt",
      data: res.stdout,
    };
  } catch (e) {
    return null;
  }
};

const clipboard = (await getPng()) || (await getText()) || null;
if (!clipboard) {
  process.exit(1);
}

switch (clipboard.type) {
  case "url":
    const { data: redirect } = await axios.post(
      "https://schof.link/api/redirect",
      { url: clipboard.data }
    );
    console.log(redirect.publicUrl);
    break;
  case "md":
    const { data: md } = await axios.post("https://schof.link/api/md", {
      content: clipboard.data,
    });
    console.log(md.publicUrl);
    break;
  default:
    const { data: file } = await axios.get("https://schof.link/api/get-url", {
      params: {
        filename: clipboard.filename,
        contentType: clipboard.type,
      },
    });
    await axios.put(file.url, clipboard.data, {
      headers: { "Content-Type": clipboard.type },
    });
    console.log(file.publicUrl);
}
