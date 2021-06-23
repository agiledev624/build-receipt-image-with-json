import canvas from "canvas";
const { createCanvas, loadImage } = canvas;
import dateFormat from "dateformat";
import fs from "fs";

import { strMap } from "./index.js";
import { params } from "./testData.js";
import { cxtTypes } from "./contextTypes.js";
// const { he, en } = strMap;
const { heParams, enParams } = params;

const langLtr = ["en"];
const langRtl = ["he"];

const convert = (
  manager,
  items,
  storeName,
  clientName,
  clientPhone,
  review,
  lang,
  logo
) => {
  const width = 552;
  const lineHeightSmall = 50;
  const lineHeightSmallest = 30;
  const lineWidthLimit = 350;
  const paddingStart = 50;
  const paddingTop = 20;
  const qtyPadding = 10;
  const detailLengthLimit = 300;
  let qtyX;
  let itemX;
  let priceX;
  let headX;

  let isrtl = false;

  if (langLtr.includes(lang)) {
    isrtl = false;
    headX = paddingStart;
    qtyX = qtyPadding;
    itemX = paddingStart + 80;
    priceX = width;
  } else if (langRtl.includes(lang)) {
    isrtl = true;
    headX = width - qtyPadding;
    qtyX = width - 10;
    itemX = width - 100;
    priceX = qtyPadding;
  }
  let height = 0;
  const canvas = createCanvas(width, 300);
  const context = canvas.getContext("2d");
  let currentY = 0;
  let sum = 0;

  // estimate the height of canvas to create
  loadImage(logo).then((logoImage) => {
    height += logoImage.height;
    loadImage(review).then((reviewImage) => {
      height += reviewImage.height;
      let lineCount = 0;
      for (let item of items) {
        let count = wrapText(context, item.displayName, lineWidthLimit);
        if (item.itemExtras) {
          for (let extra of item.itemExtras) {
            Object.values(extra).forEach((val) => {
              for (let v of val) {
                lineCount += wrapText(context, v.displayName, lineWidthLimit);
              }
            });
          }
        }
        lineCount += count;
        // if has itemComment
        if (item.itemComment) lineCount++;

        // each item has partial sum info
        lineCount++;
      }

      lineCount += 8; // four header titles, table header, total, space(2x)
      height += lineCount * lineHeightSmall;

      const real_canvas = createCanvas(width, height);
      const realContext = real_canvas.getContext("2d");

      configureContext(realContext, cxtTypes.TITLE_LARGE_CENTER);
      // realContext.fillRect(0, 0, width, height); // make the image transparent
      currentY = 50;
      realContext.drawImage(
        logoImage,
        (width - logoImage.width) / 2,
        currentY,
        logoImage.width,
        logoImage.height
      );
      currentY += logoImage.height;

      // Store Name
      realContext.textBaseline = "top";
      realContext.fillStyle = "#000";
      realContext.fillText(
        storeName,
        (width - measureText(realContext, storeName)) / 2,
        currentY
      );

      // 3 Information in header
      configureContext(realContext, cxtTypes.NORMAL_TEXT_LALIGN);

      currentY += lineHeightSmall;
      currentY += paddingTop;
      let timeDiffer = manager.supplyTime - Date.now();
      let diffTime = dateFormat(timeDiffer, "yyyy.mm.W.dd.HH.MM.ss");

      const timeInfo = diffTime.split(".");
      const timeLabels = [
        strMap[lang].years,
        strMap[lang].months,
        strMap[lang].weeks,
        strMap[lang].days,
        strMap[lang].hours,
        strMap[lang].mintues,
        strMap[lang].seconds,
      ];
      let i;
      for (i = 1; i < timeInfo.length; i++) {
        if (timeInfo[i] != "00") break;
      }
      if (timeInfo[i][0] == '0')
        timeInfo[i] = timeInfo[i][1];
      realContext.textAlign = isrtl ? "end" : "start";
      realContext.fillText(
        "🕑 " + timeInfo[i] + " " + timeLabels[i],
        headX,
        currentY
      );

      currentY += lineHeightSmall;
      realContext.fillText(
        "🤵 #" + manager.orderNum + ", " + clientName + ", " + clientPhone,
        headX,
        currentY
      );

      currentY += lineHeightSmall;
      let state = "";
      if (manager.currentCartType == "Delivery") {
        state = strMap[lang].delivery;
      } else if (manager.currentCartType == "Take away") {
        state = strMap[lang].delivery; // temporary value  change it to takeaway
      }
      realContext.fillText(state, headX, currentY);

      // Comments
      currentY += lineHeightSmall * 1.25;
      if (manager.comment) {
        realContext.fillText(
          strMap[lang].comments + manager.comment,
          headX,
          currentY
        );
      }

      // Table Headers
      currentY += lineHeightSmall * 1.25;
      realContext.textAlign = isrtl ? "end" : "start";
      realContext.fillText(strMap[lang].qty, qtyX, currentY);
      realContext.fillText(strMap[lang].item, itemX, currentY);
      realContext.textAlign = isrtl ? "start" : "end";
      realContext.fillText(strMap[lang].price, priceX, currentY);
      realContext.textAlign = isrtl ? "start" : "end";
      realContext.strokeStyle = "#000";
      realContext.beginPath();
      realContext.lineTo(0, currentY + lineHeightSmall - 20);
      realContext.lineTo(width, currentY + lineHeightSmall - 20);
      realContext.stroke();

      // search dependentItem and move to last
      for (let i = 0; i < items.length; i++) {
        if (items[i].type == "dependentItem") {
          items.push(items.splice(items.indexOf(i), 1)[0]);
          break;
        }
      }

      // Each Item in detail
      currentY += lineHeightSmall * 0.7;
      for (let item of items) {
        realContext.textAlign = isrtl ? "end" : "start";
        realContext.fillText(item.qty, qtyX, currentY);
        let count = fillText(
          realContext,
          item.displayName,
          itemX,
          currentY,
          detailLengthLimit,
          lineHeightSmallest
        );
        realContext.textAlign = isrtl ? "start" : "end";
        realContext.fillText(
          formatNumber(parseFloat(item.basePrice).toFixed(2)),
          priceX,
          currentY
        );
        currentY += count * lineHeightSmallest;
        if (item.itemExtras) {
          for (let extra of item.itemExtras) {
            Object.keys(extra).forEach((val) => {
              for (let v of extra[val]) {
                realContext.textAlign = isrtl ? "end" : "start";
                let suffix = true;
                if (item.type == "dependentItem") {
                  suffix = false;
                }
                let lines = fillText(
                  realContext,
                  (suffix ? v.qty + "x " : "") + val + ": " + v.displayName,
                  isrtl ? itemX - 40 : itemX + 40,
                  currentY,
                  detailLengthLimit,
                  lineHeightSmallest
                );
                if (suffix) {
                  realContext.textAlign = isrtl ? "start" : "end";
                  realContext.fillText(
                    "+" + formatNumber(parseFloat(v.price).toFixed(2)),
                    priceX,
                    currentY
                  );
                }

                currentY += lines * lineHeightSmallest;
              }
            });
          }
        }
        realContext.textAlign = isrtl ? "end" : "start";
        if (item.itemComment) {
          realContext.fillText("💬 " + item.itemComment, qtyX, currentY);
          currentY += lineHeightSmallest;
        }
        realContext.fillText(strMap[lang].sum, qtyX, currentY);
        realContext.textAlign = isrtl ? "start" : "end";
        sum += item.price;
        realContext.fillText(
          formatNumber(parseFloat(item.price).toFixed(2)),
          priceX,
          currentY
        );

        realContext.beginPath();
        realContext.lineTo(0, currentY + lineHeightSmall - 20);
        realContext.lineTo(width, currentY + lineHeightSmall - 20);
        realContext.stroke();
        currentY += lineHeightSmallest;

        lineCount += count;
        // if has itemComment
        if (item.itemComment) lineCount++;
        lineCount++; // each item has partial sum info
      }
      // total sum
      realContext.textAlign = isrtl ? "end" : "start";
      realContext.fillText(strMap[lang].totalSum, qtyX, currentY);
      realContext.textAlign = isrtl ? "start" : "end";
      realContext.fillText(
        formatNumber(parseFloat(sum).toFixed(2)) + " " + manager.currency,
        priceX,
        currentY
      );

      // QR code
      currentY += lineHeightSmall;
      realContext.drawImage(
        reviewImage,
        (width - reviewImage.width) / 2,
        currentY,
        reviewImage.width,
        reviewImage.height
      );
      currentY += reviewImage.height;
      configureContext(realContext, cxtTypes.BIG_TEXT);
      realContext.fillText(
        strMap[lang].review,
        (width - measureText(realContext, strMap[lang].review)) / 2,
        currentY
      );

      // current date print
      currentY += lineHeightSmall;
      configureContext(realContext, cxtTypes.TIME_TEXT);
      realContext.fillText(
        dateFormat(Date.now(), "dd.mm.yyyy, HH:MM:ss"),
        width,
        currentY
      );
      const buffer = real_canvas.toBuffer("image/png");
      fs.writeFileSync("./image_" + lang + ".png", buffer);
    });
  });
};

function formatNumber(num) {
  return num.toString().replace(/(\d)(?=(\d{3})+(?!\d))/g, "$1,");
}

const measureText = (ctx, text) => {
  const { width } = ctx.measureText(text);
  return width;
};

const configureContext = (context, type) => {
  switch (type) {
    case cxtTypes.TITLE_LARGE_CENTER:
      context.font = "bold 26pt Times New Roman";
      context.fillStyle = "#fff";
      break;
    case cxtTypes.NORMAL_TEXT_LALIGN:
      context.textAlign = "start";
      context.font = "14pt Times New Roman";
      break;
    case cxtTypes.NORMAL_TEXT_RALIGN:
      context.textAlign = "end";
      context.font = "14pt Times New Roman";
      break;
    case cxtTypes.BIG_TEXT:
      context.textAlign = "start";
      context.fillStyle = "#000";
      context.font = "20pt Times New Roman";
      break;
    case cxtTypes.TIME_TEXT:
      context.textAlign = "end";
      context.font = "14pt Times New Roman";
      context.fillStyle = "rgba(0, 0, 0, 0.5)";
      break;
  }
};

// get lines for limit width
const wrapText = (ctx, text, limit) => {
  const line = text;
  let s = "";
  let y = 0;
  if (text) {
    y = 1;
  } else {
    return 0;
  }
  for (const char of line) {
    const { width } = ctx.measureText(s + char);
    if (width <= limit) {
      s += char;
    } else {
      y++;
      s = char;
    }
  }
  // if (s.length > 2) {
  //   y++;
  // }
  return y;
};

// fill text with multi-lines on canvas
const fillText = (ctx, text, x, y, maxWidth, height, spacing = 0) => {
  const lines = text.split("\n");
  let lineHeight = 0;
  let linecount = 0;
  let space = false;
  for (const line of lines) {
    if (!line) {
      y += lineHeight;
      continue;
    }
    let s = "";
    for (const char of line) {
      const { width } = ctx.measureText(s + char);
      if (width <= maxWidth || char != " ") {
        s += char;
      } else {
        ctx.fillText(s, x, y);
        lineHeight = height + spacing;
        y += lineHeight + spacing;
        linecount++;
        s = char;
      }
    }
    if (s) {
      ctx.fillText(s, x, y);
      lineHeight = height + spacing;
      y += lineHeight;
      linecount++;
    }
  }
  return linecount;
};

// Get scaled image keeping aspect
const scaleWithAspect = (width, height, scaleWidth) => {
  const scale = {
    width: 0,
    height: 0,
  };
  scale.width = scaleWidth;
  scale.height = (scaleWidth / width) * height;
  return scale;
};

convert(
  heParams.manager,
  heParams.items,
  heParams.storeName,
  heParams.clientName,
  heParams.clientPhone,
  heParams.review,
  heParams.lang,
  heParams.logo
);

convert(
  enParams.manager,
  enParams.items,
  enParams.storeName,
  enParams.clientName,
  enParams.clientPhone,
  enParams.review,
  enParams.lang,
  enParams.logo
);
