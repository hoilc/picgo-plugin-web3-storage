const { Web3Storage } = require("web3.storage");
const { Readable } = require("stream");

const defaultIPFSGatwway = "https://nftstorage.link/ipfs/{}";

module.exports = (ctx) => {
  const register = () => {
    ctx.helper.uploader.register("web3-storage", {
      handle,
      name: "Web3 Storage",
      config,
    });
  };
  return {
    uploader: "web3-storage",
    register,
  };
};

const config = (ctx) => {
  let userConfig = ctx.getConfig("picBed.web3-storage");
  if (!userConfig) {
    userConfig = {};
  }
  return [
    {
      name: "token",
      type: "input",
      default: userConfig.token,
      required: true,
      alias: "API Token",
      message: "Created at https://web3.storage/tokens/",
    },
    {
      name: "gateway",
      type: "input",
      default: defaultIPFSGatwway,
      required: false,
      alias: "IPFS Gateway",
      message:
        "{} would be replaced to cid, default to https://nftstorage.link/ipfs/{}",
    },
    {
      name: "filenameInURL",
      type: "confirm",
      default: false,
      required: false,
      alias: "Filename In URL",
      message: "One batch could share the same cid, default to false",
    },
  ];
};

const handle = async (ctx) => {
  let userConfig = ctx.getConfig("picBed.web3-storage");
  if (!userConfig) {
    throw new Error(`未配置API Token，可在 https://web3.storage/tokens/ 创建`);
  }
  const gateway = userConfig.gateway || defaultIPFSGatwway;
  const filenameInURL = userConfig.filenameInURL || false;
  const client = new Web3Storage({ token: userConfig.token });
  const imgList = ctx.output;
  const imageFiles = [];
  for (let i in imgList) {
    let image = imgList[i].buffer;
    if (!image && imgList[i].base64Image) {
      image = Buffer.from(imgList[i].base64Image, "base64");
    }
    const file = {
      name: `/${imgList[i].fileName}`,
      stream: () => Readable.from(image),
      mode: 33188,
      mtime: new Date(),
      size: image.length,
    };
    imageFiles.push(file);
    // no directory
    if (!filenameInURL) {
      const rootCid = await client.put([file], {
        name: imgList[i].fileName,
        wrapWithDirectory: false,
      });
      imgList[i].imgUrl = `${gateway.replace("{}", rootCid)}`;
    }
  }
  if (filenameInURL) {
    const rootCid = await client.put(imageFiles, {
      name: imgList[0].fileName,
    });
    for (let i in imgList) {
      imgList[i].imgUrl = `${gateway.replace("{}", rootCid)}/${
        imgList[i].fileName
      }`;
    }
  }
};
