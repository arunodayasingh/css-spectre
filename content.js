const root = document.documentElement;

// 1. Create and Inject Result Bar (Spectre Header)
const resultBar = document.createElement("div");
resultBar.id = "spectre-hud";
document.body.appendChild(resultBar);

// 2. Create Box Model Overlay
const overlay = document.createElement("div");
overlay.id = "spectre-overlay";
document.body.appendChild(overlay);

const marginBox = document.createElement("div"); marginBox.className = "spectre-box spectre-margin";
const paddingBox = document.createElement("div"); paddingBox.className = "spectre-box spectre-padding";
const contentBox = document.createElement("div"); contentBox.className = "spectre-box spectre-content";

overlay.appendChild(marginBox);
overlay.appendChild(paddingBox);
overlay.appendChild(contentBox);

// Initialize state
let isEnabled = false;
let observer = null;

const assignColor = (el) => {
  const hue = Math.floor(Math.random() * 360);

  // Set Hue for Outline (always)
  if (!el.style.getPropertyValue("--debug-hue")) {
    el.style.setProperty("--debug-hue", hue);
  }

  // Check for existing background
  const style = window.getComputedStyle(el);
  const hasBgColor = style.backgroundColor && style.backgroundColor !== 'rgba(0, 0, 0, 0)' && style.backgroundColor !== 'transparent';
  const hasBgImage = style.backgroundImage && style.backgroundImage !== 'none';

  if (!hasBgColor && !hasBgImage) {
    el.setAttribute('data-spectre-no-bg', 'true');
  } else {
    el.removeAttribute('data-spectre-no-bg');
  }
};

const handleMutations = (mutations) => {
  if (!isEnabled) return;
  mutations.forEach((mutation) => {
    mutation.addedNodes.forEach((node) => {
      if (node.nodeType === 1 && node.id !== "spectre-hud" && node.id !== "spectre-overlay" && !node.closest("#spectre-hud") && !node.closest("#spectre-overlay")) {
        assignColor(node);
        node.querySelectorAll('*').forEach(assignColor);
      }
    });
  });
};

// 2. State Management
const setDebugState = (enabled) => {
  isEnabled = enabled;
  if (enabled) {
    if (!document.getElementById("spectre-hud")) document.body.appendChild(resultBar);
    if (!document.getElementById("spectre-overlay")) document.body.appendChild(overlay);

    root.setAttribute("data-debug", "on");
    resultBar.style.display = "block";
    overlay.style.display = "block";

    // Assign colors to all existing elements
    document.querySelectorAll("body *").forEach((el) => {
      if (el.id !== "spectre-hud" && el.id !== "spectre-overlay" && !el.closest("#spectre-hud") && !el.closest("#spectre-overlay")) {
        assignColor(el);
      }
    });

    // Start Observing
    observer = new MutationObserver(handleMutations);
    observer.observe(document.body, { childList: true, subtree: true });

  } else {
    root.removeAttribute("data-debug");
    resultBar.style.display = "none";
    overlay.style.display = "none";

    // Stop Observing
    if (observer) {
      observer.disconnect();
      observer = null;
    }
  }
};

// Default check
if (root.getAttribute("data-debug") === "on") {
  setDebugState(true);
}

// 3. Message Listener
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  // Respond to both old and new messages to be safe during transition, or just the original one
  if (msg.type === "TOGGLE_SPECTRE") {
    setDebugState(!isEnabled);
  }
});

// Helper: RGB to Hex
const rgbToHex = (col) => {
  if (col.charAt(0) === 'r') {
    col = col.replace('rgb(', '').replace(')', '').split(',');
    var r = parseInt(col[0], 10).toString(16);
    var g = parseInt(col[1], 10).toString(16);
    var b = parseInt(col[2], 10).toString(16);
    r = r.length === 1 ? '0' + r : r;
    g = g.length === 1 ? '0' + g : g;
    b = b.length === 1 ? '0' + b : b;
    var colHex = '#' + r + g + b;
    return colHex.toUpperCase();
  }
  return col;
};

// Helper: Parse px value
const getVal = (str) => parseFloat(str) || 0;

// 4. Interaction Logic (MouseOver for Header Update & Overlay)
document.addEventListener("mouseover", (e) => {
  if (!isEnabled) return;
  // Ignore the result bar and overlay
  if (e.target.id === "spectre-hud" || e.target.closest("#spectre-hud") || e.target.id === "spectre-overlay" || e.target.closest("#spectre-overlay")) return;

  const el = e.target;
  const cs = window.getComputedStyle(el); // Get computed styles
  const rect = el.getBoundingClientRect(); // Ensure this is defined here!

  // --- UPDATE OVERLAY POSITIONS ---
  try {
    const mt = getVal(cs.marginTop);
    const mr = getVal(cs.marginRight);
    const mb = getVal(cs.marginBottom);
    const ml = getVal(cs.marginLeft);

    const bt = getVal(cs.borderTopWidth);
    const br = getVal(cs.borderRightWidth);
    const bb = getVal(cs.borderBottomWidth);
    const bl = getVal(cs.borderLeftWidth);

    const pt = getVal(cs.paddingTop);
    const pr = getVal(cs.paddingRight);
    const pb = getVal(cs.paddingBottom);
    const pl = getVal(cs.paddingLeft);

    // Margin Box (Orange) - Outer
    // Position relative to viewport (fixed)
    if (marginBox) {
      marginBox.style.width = `${rect.width + ml + mr}px`;
      marginBox.style.height = `${rect.height + mt + mb}px`;
      marginBox.style.top = `${rect.top - mt}px`;
      marginBox.style.left = `${rect.left - ml}px`;
    }

    // Padding Box (Green) - Start inside borders
    // Width = BorderBox - Borders
    if (paddingBox) {
      paddingBox.style.width = `${rect.width - bl - br}px`;
      paddingBox.style.height = `${rect.height - bt - bb}px`;
      paddingBox.style.top = `${rect.top + bt}px`;
      paddingBox.style.left = `${rect.left + bl}px`;
    }

    // Content Box (Blue) - Start inside padding
    // Width = PaddingBox - Padding
    if (contentBox) {
      contentBox.style.width = `${rect.width - bl - br - pl - pr}px`;
      contentBox.style.height = `${rect.height - bt - bb - pt - pb}px`;
      contentBox.style.top = `${rect.top + bt + pt}px`;
      contentBox.style.left = `${rect.left + bl + pl}px`;
    }
  } catch (err) {
    // Silent fail for overlay errors to avoid console spam
  }

  // --- END OVERLAY ---

  // Tag Name
  const tagName = el.tagName.toLowerCase();

  // ID
  const id = el.id ? ` <span class="id">#${el.id}</span>` : "";

  // Class
  const className = el.className && typeof el.className === 'string'
    ? ` <span class="class">.${el.className.split(/\s+/).filter(Boolean).join(".")}</span>`
    : "";

  // Dimensions
  // rect is already calculated above for overlay
  const size = `${Math.round(rect.width)} × ${Math.round(rect.height)}`;

  // Extract Comprehensive CSS Properties
  const props = [
    // Box Model
    ['Display', cs.display],
    ['Position', cs.position],
    ['Width', `${Math.round(rect.width)}px`],
    ['Height', `${Math.round(rect.height)}px`],
    ['Margin', cs.marginTop === cs.marginBottom && cs.marginLeft === cs.marginRight && cs.marginTop === cs.marginLeft ? cs.marginTop : `${cs.marginTop} ${cs.marginRight} ${cs.marginBottom} ${cs.marginLeft}`],
    ['Padding', cs.paddingTop === cs.paddingBottom && cs.paddingLeft === cs.paddingRight && cs.paddingTop === cs.paddingLeft ? cs.paddingTop : `${cs.paddingTop} ${cs.paddingRight} ${cs.paddingBottom} ${cs.paddingLeft}`],
    ['Border', cs.borderWidth !== '0px' ? `${cs.borderWidth} ${cs.borderStyle} ${rgbToHex(cs.borderColor)}` : 'none'],

    // Typography
    ['Font', `${cs.fontSize} ${cs.fontFamily.split(',')[0].replace(/"/g, '')}`],
    ['Line-Height', cs.lineHeight],
    ['Color', rgbToHex(cs.color)],
    ['Text-Align', cs.textAlign],

    // Visuals
    ['Background', rgbToHex(cs.backgroundColor)],
    ['Opacity', cs.opacity],
    ['Z-Index', cs.zIndex !== 'auto' ? cs.zIndex : ''],
    ['Border-Radius', cs.borderRadius !== '0px' ? cs.borderRadius : ''],
    ['Box-Shadow', cs.boxShadow !== 'none' ? 'Yes' : ''],

    // Flex/Grid (only if relevant)
    ['Flex-Direction', cs.display.includes('flex') ? cs.flexDirection : ''],
    ['Justify-Content', cs.display.includes('flex') ? cs.justifyContent : ''],
    ['Align-Items', cs.display.includes('flex') ? cs.alignItems : ''],
    ['Gap', (cs.display.includes('flex') || cs.display.includes('grid')) ? cs.gap : '']
  ];

  // Filter empty or default-looking values to keep it clean but comprehensive
  const validProps = props.filter(([k, v]) => v && v !== 'none' && v !== 'auto' && v !== 'normal' && v !== '0px' && v !== 'rgba(0, 0, 0, 0)');

  // Format as tags
  const propHtml = validProps.map(([k, v]) => `<span style="display:inline-block; background:rgba(255,255,255,0.1); padding:2px 6px; margin:2px; border-radius:4px;"><span style="color:#aaa">${k}:</span> <span style="color:#fff">${v}</span></span>`).join(" ");

  // Build Footer String
  resultBar.innerHTML = `
    <div style="margin-bottom:4px; font-size:1.1em;">
      <strong>${tagName}</strong>${id}${className} 
    </div>
    <div>${propHtml}</div>
  `;
});

// CLICK SHORTCUT
document.addEventListener("click", (e) => {
  if (isEnabled && e.ctrlKey) {
    console.log("Spectre Debug:", e.target);
  }
});
