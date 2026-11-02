/**
 * PUBG Store | Premium Gaming Shop
 * Main storefront script — checkout, packages, WhatsApp, tracking.
 * Payment verification is MANUAL. Nothing here marks an order as paid.
 */

(function () {
    "use strict";

    const CFG = window.STORE_CONFIG || {};
    const JAZZ = CFG.jazzCash || {};
    const WA = CFG.whatsapp || {};
    const RECEIPT = CFG.receipt || {};
    const STORAGE_KEY = "pubg_store_orders_v1";

    // -----------------------------------------------------------
    // Helpers
    // -----------------------------------------------------------
    const $ = (sel, root = document) => root.querySelector(sel);
    const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
    const money = (n) => "Rs. " + Number(n).toLocaleString("en-PK");

    const toastContainer = () => document.getElementById("toast-container");

    function toast(message, type = "info") {
        const wrap = toastContainer();
        if (!wrap) return;
        const icons = {
            success: "fa-circle-check",
            error: "fa-circle-exclamation",
            info: "fa-circle-info"
        };
        const el = document.createElement("div");
        el.className = `toast ${type}`;
        el.innerHTML = `<i class="fa-solid ${icons[type] || icons.info}"></i><span></span>`;
        el.querySelector("span").textContent = message;
        wrap.appendChild(el);
        setTimeout(() => {
            el.classList.add("hide");
            setTimeout(() => el.remove(), 320);
        }, 3600);
    }

    function copyText(text, btn) {
        const done = () => {
            if (btn) {
                const original = btn.innerHTML;
                btn.classList.add("copied");
                btn.innerHTML = '<i class="fa-solid fa-check"></i> Copied';
                setTimeout(() => {
                    btn.classList.remove("copied");
                    btn.innerHTML = original;
                }, 1600);
            }
            toast("Copied to clipboard", "success");
        };

        if (navigator.clipboard && window.isSecureContext) {
            navigator.clipboard.writeText(text).then(done).catch(() => fallbackCopy(text, done));
        } else {
            fallbackCopy(text, done);
        }
    }

    function fallbackCopy(text, done) {
        const ta = document.createElement("textarea");
        ta.value = text;
        ta.setAttribute("readonly", "");
        ta.style.position = "fixed";
        ta.style.opacity = "0";
        document.body.appendChild(ta);
        ta.select();
        try {
            document.execCommand("copy");
            done();
        } catch (e) {
            toast("Could not copy automatically", "error");
        }
        ta.remove();
    }

    function loadOrders() {
        try {
            return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
        } catch (e) {
            return [];
        }
    }

    function saveOrders(list) {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
            return true;
        } catch (e) {
            return false;
        }
    }

    function makeOrderId() {
        return "PUBG-" + Math.floor(100000 + Math.random() * 900000);
    }

    function escapeHtml(str) {
        return String(str)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#39;");
    }

    // -----------------------------------------------------------
    // 1. Preloader
    // -----------------------------------------------------------
    window.addEventListener("load", () => {
        const pre = document.getElementById("preloader");
        if (pre) setTimeout(() => pre.classList.add("hidden"), 450);
    });
    // Safety: never leave the loader stuck if a resource hangs
    setTimeout(() => {
        const pre = document.getElementById("preloader");
        if (pre) pre.classList.add("hidden");
    }, 3500);

    // -----------------------------------------------------------
    // 2. Navigation
    // -----------------------------------------------------------
    const header = document.getElementById("header");
    const navMenu = document.getElementById("nav-menu");
    const hamburger = document.getElementById("hamburger-menu");
    const navLinks = $$(".nav-link");
    const scrollToTopBtn = document.getElementById("scroll-to-top-btn");

    if (hamburger && navMenu) {
        hamburger.addEventListener("click", () => {
            const open = navMenu.classList.toggle("active");
            hamburger.classList.toggle("active", open);
            hamburger.setAttribute("aria-expanded", String(open));
        });
        const closeMenu = () => {
            navMenu.classList.remove("active");
            hamburger.classList.remove("active");
            hamburger.setAttribute("aria-expanded", "false");
        };
        navLinks.forEach((l) => l.addEventListener("click", closeMenu));
        document.addEventListener("keydown", (e) => {
            if (e.key === "Escape") closeMenu();
        });
    }

    window.addEventListener("scroll", () => {
        if (header) header.classList.toggle("scrolled", window.scrollY > 50);
        if (scrollToTopBtn) scrollToTopBtn.classList.toggle("show", window.scrollY > 400);
    });

    if (scrollToTopBtn) {
        scrollToTopBtn.addEventListener("click", () => window.scrollTo({ top: 0, behavior: "smooth" }));
    }

    // Active link highlight
    const sections = $$("section[id]");
    window.addEventListener("scroll", () => {
        const y = window.scrollY + 140;
        let current = "";
        sections.forEach((s) => {
            if (y >= s.offsetTop) current = s.id;
        });
        navLinks.forEach((l) => {
            const href = l.getAttribute("href") || "";
            l.classList.toggle("active", href === "#" + current);
        });
    });

    // -----------------------------------------------------------
    // 3. Scroll reveal
    // -----------------------------------------------------------
    if ("IntersectionObserver" in window) {
        const io = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting) {
                        entry.target.classList.add("active");
                        io.unobserve(entry.target);
                    }
                });
            },
            { threshold: 0.12, rootMargin: "0px 0px -40px 0px" }
        );
        $$(".scroll-reveal").forEach((el) => io.observe(el));
    } else {
        $$(".scroll-reveal").forEach((el) => el.classList.add("active"));
    }

    // -----------------------------------------------------------
    // 4. Config-driven UI (payment instructions + amounts)
    // -----------------------------------------------------------
    const instructions = Array.isArray(JAZZ.instructions) ? JAZZ.instructions : [];
    const instrHTML = instructions.map((t) => `<li>${escapeHtml(t)}</li>`).join("");
    ["payment-instructions", "checkout-instructions"].forEach((id) => {
        const el = document.getElementById(id);
        if (el) el.innerHTML = instrHTML;
    });

    ["account-number", "checkout-account-number"].forEach((id) => {
        const el = document.getElementById(id);
        if (el) el.textContent = JAZZ.accountNumber || "—";
    });
    const accTitle = document.getElementById("account-title");
    if (accTitle) accTitle.textContent = JAZZ.accountTitle || CFG.storeName || "PUBG Store";

    const receiptRules = document.getElementById("receipt-rules");
    if (receiptRules) {
        receiptRules.textContent = RECEIPT.acceptedLabel || "JPG, PNG, WEBP or PDF, max 5 MB";
    }

    // -----------------------------------------------------------
    // 5. Packages: render + search + filter
    // -----------------------------------------------------------
    const grid = document.getElementById("packages-grid");
    const searchInput = document.getElementById("package-search");
    const chipWrap = document.getElementById("filter-chips");
    const emptyState = document.getElementById("packages-empty");
    const packages = Array.isArray(CFG.packages) ? CFG.packages : [];
    const filters = Array.isArray(CFG.filters) ? CFG.filters : [];

    let activeFilter = "all";
    let searchTerm = "";

    function packageCard(p) {
        const hasOld = p.oldPrice && p.oldPrice > p.price;
        const off = hasOld ? Math.round(((p.oldPrice - p.price) / p.oldPrice) * 100) : 0;
        const badge = p.badge || (off > 0 ? `Save ${off}%` : "");
        return `
        <article class="package-card${p.featured ? " featured" : ""} scroll-reveal active" data-id="${escapeHtml(p.id)}">
            ${p.featured ? '<div class="featured-ribbon">Most Popular</div>' : ""}
            ${badge ? `<div class="card-badge">${escapeHtml(badge)}</div>` : ""}
            <div class="coin-wrap"><i class="fa-solid fa-coins"></i></div>
            <div class="uc-badge">${Number(p.uc).toLocaleString()}<span>UC</span></div>
            <h3 class="package-name">${escapeHtml(p.name)}</h3>
            <div class="price-row">
                <span class="package-price">${money(p.price)}</span>
                ${hasOld ? `<span class="old-price">${money(p.oldPrice)}</span>` : ""}
            </div>
            <div class="discount-label">${off > 0 ? `You save ${money(p.oldPrice - p.price)} (${off}%)` : "Best price in PKR"}</div>
            <ul class="package-features">
                <li>Delivery in ${escapeHtml(CFG.deliveryTime || "minutes")}</li>
                <li>Manual JazzCash verification</li>
                <li>WhatsApp order support</li>
            </ul>
            <button type="button" class="btn btn-primary buy-btn" data-id="${escapeHtml(p.id)}">
                Buy Now <i class="fa-solid fa-arrow-right"></i>
            </button>
        </article>`;
    }

    function renderPackages() {
        if (!grid) return;
        const term = searchTerm.trim().toLowerCase();
        const range = filters.find((f) => f.id === activeFilter) || filters[0];

        const list = packages.filter((p) => {
            const inRange = p.price >= range.min && p.price <= range.max;
            if (!inRange) return false;
            if (!term) return true;
            const hay = `${p.uc} ${p.name} ${(p.tags || []).join(" ")}`.toLowerCase();
            return hay.includes(term);
        });

        grid.innerHTML = list.map(packageCard).join("");
        if (emptyState) emptyState.hidden = list.length > 0;

        $$(".buy-btn", grid).forEach((btn) => {
            btn.addEventListener("click", () => openCheckout(btn.dataset.id));
        });
    }

    function renderChips() {
        if (!chipWrap) return;
        chipWrap.innerHTML = filters
            .map(
                (f) =>
                    `<button type="button" class="chip${f.id === activeFilter ? " active" : ""}" data-filter="${escapeHtml(f.id)}" role="tab" aria-selected="${f.id === activeFilter}">${escapeHtml(f.label)}</button>`
            )
            .join("");
        $$(".chip", chipWrap).forEach((c) => {
            c.addEventListener("click", () => {
                activeFilter = c.dataset.filter;
                renderChips();
                renderPackages();
            });
        });
    }

    if (searchInput) {
        searchInput.addEventListener("input", () => {
            searchTerm = searchInput.value;
            renderPackages();
        });
    }
    renderChips();
    renderPackages();

    // -----------------------------------------------------------
    // 6. Copy buttons
    // -----------------------------------------------------------
    document.addEventListener("click", (e) => {
        const btn = e.target.closest("[data-copy-target]");
        if (!btn) return;
        const target = document.getElementById(btn.dataset.copyTarget);
        if (target) copyText(target.textContent.trim(), btn);
    });

    // -----------------------------------------------------------
    // 7. Checkout
    // -----------------------------------------------------------
    const checkoutModal = document.getElementById("checkout-modal");
    const checkoutForm = document.getElementById("checkout-form");
    const closeCheckoutBtn = document.getElementById("close-checkout");
    const backBtn = document.getElementById("checkout-back");
    const nextBtn = document.getElementById("checkout-next");
    const submitBtn = document.getElementById("checkout-submit");
    const navBar = document.getElementById("checkout-nav");
    const stepItems = $$("#checkout-steps li");
    const panels = $$(".checkout-panel");

    const nameInput = document.getElementById("customer-name");
    const idInput = document.getElementById("player-id");
    const gameNameInput = document.getElementById("player-name");
    const confirmChk = document.getElementById("confirm-payment-read");
    const fileInput = document.getElementById("receipt-file");
    const fileDrop = document.getElementById("receipt-drop");
    const filePreview = document.getElementById("receipt-preview");
    const fileNameEl = document.getElementById("receipt-name");
    const fileSizeEl = document.getElementById("receipt-size");
    const fileRemove = document.getElementById("receipt-remove");

    let step = 1;
    let currentPkg = null;
    let receipt = null; // { name, size, type }

    const MAX_BYTES = (RECEIPT.maxSizeMB || 5) * 1024 * 1024;
    const OK_TYPES = RECEIPT.acceptedTypes || ["image/jpeg", "image/png", "image/webp", "application/pdf"];

    function showError(id, show) {
        const el = document.getElementById(id);
        if (el) el.classList.toggle("visible", !!show);
    }

    function setStep(n) {
        step = n;
        panels.forEach((p) => p.classList.toggle("active", Number(p.dataset.panel) === n));
        stepItems.forEach((li) => {
            const s = Number(li.dataset.step);
            li.classList.toggle("active", s === n);
            li.classList.toggle("done", s < n);
        });
        if (navBar) navBar.style.display = n >= 6 ? "none" : "flex";
        if (backBtn) backBtn.hidden = n === 1;
        if (nextBtn) nextBtn.hidden = n >= 5;
        if (submitBtn) submitBtn.hidden = n !== 5;
        const box = checkoutModal && checkoutModal.querySelector(".modal-box");
        if (box) box.scrollTop = 0;
    }

    function updateAmounts() {
        if (!currentPkg) return;
        const label = `${currentPkg.uc} UC — ${money(currentPkg.price)}`;
        const summary = document.getElementById("selected-package-summary");
        const total = document.getElementById("selected-package-total");
        const checkoutAmount = document.getElementById("checkout-amount");
        const payAmount = document.getElementById("payment-amount");
        if (summary) summary.textContent = label;
        if (total) total.textContent = money(currentPkg.price);
        if (checkoutAmount) checkoutAmount.textContent = money(currentPkg.price);
        if (payAmount) payAmount.textContent = `${money(currentPkg.price)} (${currentPkg.uc} UC)`;
    }

    function openCheckout(pkgId) {
        currentPkg = packages.find((p) => p.id === pkgId) || null;
        if (!currentPkg) {
            toast("Package not found", "error");
            return;
        }
        updateAmounts();
        renderReview();
        resetCheckout();
        setStep(1);
        if (checkoutModal) {
            checkoutModal.classList.add("open");
            document.body.style.overflow = "hidden";
        }
    }

    function closeCheckout() {
        if (checkoutModal) checkoutModal.classList.remove("open");
        document.body.style.overflow = "auto";
    }

    function resetCheckout() {
        [nameInput, idInput, gameNameInput].forEach((i) => {
            if (i) {
                i.value = "";
                i.classList.remove("invalid");
            }
        });
        if (confirmChk) confirmChk.checked = false;
        ["customer-name-error", "player-id-error", "player-name-error", "confirm-payment-error", "receipt-error"].forEach((id) => showError(id, false));
        clearReceipt();
    }

    function validateStep(n) {
        if (n === 2) {
            const name = (nameInput?.value || "").trim();
            const pid = (idInput?.value || "").trim();
            const gname = (gameNameInput?.value || "").trim();
            let ok = true;

            const nameBad = name.length < 2;
            showError("customer-name-error", nameBad);
            nameInput?.classList.toggle("invalid", nameBad);
            if (nameBad) ok = false;

            const idBad = !/^\d{8,12}$/.test(pid);
            showError("player-id-error", idBad);
            idInput?.classList.toggle("invalid", idBad);
            if (idBad) ok = false;

            const gBad = gname.length < 2;
            showError("player-name-error", gBad);
            gameNameInput?.classList.toggle("invalid", gBad);
            if (gBad) ok = false;

            if (!ok) toast("Please fix the highlighted fields", "error");
            return ok;
        }

        if (n === 3) {
            const ok = !!(confirmChk && confirmChk.checked);
            showError("confirm-payment-error", !ok);
            if (!ok) toast("Please confirm you read the payment instructions", "error");
            return ok;
        }

        if (n === 4) {
            const ok = !!receipt;
            showError("receipt-error", !ok);
            fileDrop?.classList.toggle("invalid", !ok);
            if (!ok) toast("Attach your JazzCash payment receipt", "error");
            return ok;
        }

        return true;
    }

    function renderReview() {
        const card = document.getElementById("review-card");
        if (!card || !currentPkg) return;
        card.innerHTML = `
            <div class="review-row"><span>Customer</span><strong>${escapeHtml((nameInput?.value || "").trim())}</strong></div>
            <div class="review-row"><span>Package</span><strong>${currentPkg.uc} UC (${escapeHtml(currentPkg.name)})</strong></div>
            <div class="review-row"><span>PUBG Player ID</span><strong>${escapeHtml((idInput?.value || "").trim())}</strong></div>
            <div class="review-row"><span>In-game name</span><strong>${escapeHtml((gameNameInput?.value || "").trim())}</strong></div>
            <div class="review-row"><span>Payment method</span><strong>JazzCash — ${escapeHtml(JAZZ.accountNumber || "")}</strong></div>
            <div class="review-row"><span>Receipt</span><strong>${receipt ? escapeHtml(receipt.name) : "—"}</strong></div>
            <div class="review-row highlight"><span>Total amount</span><strong>${money(currentPkg.price)}</strong></div>`;
    }

    if (nextBtn) {
        nextBtn.addEventListener("click", () => {
            if (!validateStep(step)) return;
            if (step === 4) renderReview();
            setStep(Math.min(step + 1, 5));
        });
    }
    if (backBtn) {
        backBtn.addEventListener("click", () => setStep(Math.max(step - 1, 1)));
    }

    // Receipt handling
    function humanSize(bytes) {
        if (bytes < 1024) return bytes + " B";
        if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(0) + " KB";
        return (bytes / (1024 * 1024)).toFixed(2) + " MB";
    }

    function clearReceipt() {
        receipt = null;
        if (fileInput) fileInput.value = "";
        if (filePreview) filePreview.hidden = true;
        fileDrop?.classList.remove("invalid");
        showError("receipt-error", false);
    }

    function acceptFile(file) {
        if (!file) return;
        if (!OK_TYPES.includes(file.type)) {
            clearReceipt();
            showError("receipt-error", true);
            fileDrop?.classList.add("invalid");
            toast(`Unsupported file type. ${RECEIPT.acceptedLabel || ""}`, "error");
            return;
        }
        if (file.size > MAX_BYTES) {
            clearReceipt();
            showError("receipt-error", true);
            fileDrop?.classList.add("invalid");
            toast(`File too large (max ${RECEIPT.maxSizeMB || 5} MB)`, "error");
            return;
        }
        receipt = { name: file.name, size: file.size, type: file.type };
        if (fileNameEl) fileNameEl.textContent = file.name;
        if (fileSizeEl) fileSizeEl.textContent = humanSize(file.size);
        if (filePreview) filePreview.hidden = false;
        fileDrop?.classList.remove("invalid");
        showError("receipt-error", false);
        toast("Receipt attached", "success");
    }

    if (fileInput) fileInput.addEventListener("change", (e) => acceptFile(e.target.files[0]));
    if (fileRemove) fileRemove.addEventListener("click", clearReceipt);
    if (fileDrop) {
        ["dragenter", "dragover"].forEach((ev) =>
            fileDrop.addEventListener(ev, (e) => {
                e.preventDefault();
                fileDrop.classList.add("dragover");
            })
        );
        ["dragleave", "drop"].forEach((ev) =>
            fileDrop.addEventListener(ev, (e) => {
                e.preventDefault();
                fileDrop.classList.remove("dragover");
            })
        );
        fileDrop.addEventListener("drop", (e) => {
            const f = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
            if (f) {
                const dt = new DataTransfer();
                dt.items.add(f);
                if (fileInput) fileInput.files = dt.files;
                acceptFile(f);
            }
        });
    }

    // Clear errors while typing
    [
        [nameInput, "customer-name-error"],
        [idInput, "player-id-error"],
        [gameNameInput, "player-name-error"]
    ].forEach(([input, errId]) => {
        if (!input) return;
        input.addEventListener("input", () => {
            input.classList.remove("invalid");
            showError(errId, false);
        });
    });
    if (confirmChk) {
        confirmChk.addEventListener("change", () => showError("confirm-payment-error", !confirmChk.checked));
    }

    // Submit order
    if (checkoutForm) {
        checkoutForm.addEventListener("submit", (e) => {
            e.preventDefault();
            if (!validateStep(4) || !currentPkg) return;

            const order = {
                orderId: makeOrderId(),
                customer: (nameInput?.value || "").trim(),
                playerId: (idInput?.value || "").trim(),
                inGameName: (gameNameInput?.value || "").trim(),
                packageId: currentPkg.id,
                uc: currentPkg.uc,
                packageName: currentPkg.name,
                amount: currentPkg.price,
                currency: "PKR",
                paymentMethod: "JazzCash",
                paymentAccount: JAZZ.accountNumber || "",
                receiptName: receipt ? receipt.name : "",
                receiptSize: receipt ? receipt.size : 0,
                status: "Pending", // manual verification — never auto-verified
                createdAt: new Date().toISOString(),
                channel: "website"
            };

            const btn = submitBtn;
            const original = btn ? btn.innerHTML : "";
            if (btn) {
                btn.disabled = true;
                btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Saving order…';
            }

            const finish = (stored) => {
                if (btn) {
                    btn.disabled = false;
                    btn.innerHTML = original;
                }
                const wa = buildWhatsAppMessage(order);
                const link = document.getElementById("whatsapp-order-link");
                if (link) link.href = wa;
                const idEl = document.getElementById("generated-order-id");
                if (idEl) idEl.textContent = order.orderId;

                setStep(6);
                toast(stored ? `Order ${order.orderId} saved as Pending` : "Order created — send it on WhatsApp", "stored" in {} ? "info" : stored ? "success" : "info");

                // Open WhatsApp in a new tab (popup-safe: triggered in this handler)
                window.open(wa, "_blank", "noopener");
            };

            // Optional backend (only when apiBase is configured)
            const apiBase = (CFG.apiBase || "").replace(/\/$/, "");
            if (apiBase) {
                fetch(apiBase + "/api/orders", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(order)
                })
                    .then((r) => {
                        if (!r.ok) throw new Error("bad status");
                        return r.json().catch(() => ({}));
                    })
                    .then((data) => {
                        if (data && data.orderId) order.orderId = data.orderId;
                        saveOrderLocal(order);
                        finish(true);
                    })
                    .catch(() => {
                        saveOrderLocal(order);
                        finish(true);
                    });
            } else {
                const stored = saveOrderLocal(order);
                finish(stored);
            }
        });
    }

    function saveOrderLocal(order) {
        const list = loadOrders();
        list.unshift(order);
        // keep the last 100 orders only
        return saveOrders(list.slice(0, 100));
    }

    function buildWhatsAppMessage(o) {
        const lines = [
            `Hello ${CFG.storeName || "PUBG Store"}, I want to place a UC order.`,
            ``,
            `*Order ID:* ${o.orderId}`,
            `*Customer:* ${o.customer}`,
            `*Package:* ${o.uc} UC — ${o.packageName}`,
            `*Amount:* ${money(o.amount)} (${o.currency})`,
            `*Payment method:* JazzCash (${o.paymentAccount})`,
            `*PUBG Player ID:* ${o.playerId}`,
            `*In-game name:* ${o.inGameName}`,
            `*Receipt file:* ${o.receiptName || "attaching shortly"}`,
            `*Status:* Pending verification`,
            ``,
            `I have sent the ${money(o.amount)} to your JazzCash account. Please verify the payment manually and confirm. Receipt screenshot attached.`
        ];
        return `https://wa.me/${WA.number || ""}?text=${encodeURIComponent(lines.join("\n"))}`;
    }

    if (closeCheckoutBtn) closeCheckoutBtn.addEventListener("click", closeCheckout);
    if (checkoutModal) {
        checkoutModal.addEventListener("click", (e) => {
            if (e.target === checkoutModal) closeCheckout();
        });
    }
    document.addEventListener("keydown", (e) => {
        if (e.key === "Escape" && checkoutModal && checkoutModal.classList.contains("open")) closeCheckout();
    });

    const finishBtn = document.getElementById("finish-order");
    if (finishBtn) finishBtn.addEventListener("click", closeCheckout);

    const copyOrderIdBtn = document.getElementById("copy-order-id");
    if (copyOrderIdBtn) {
        copyOrderIdBtn.addEventListener("click", () => {
            const el = document.getElementById("generated-order-id");
            if (el) copyText(el.textContent.trim(), copyOrderIdBtn);
        });
    }

    // -----------------------------------------------------------
    // 8. Order tracking
    // -----------------------------------------------------------
    const trackForm = document.getElementById("track-form");
    const trackResult = document.getElementById("track-result");

    function statusBadge(status) {
        const s = String(status || "Pending").toLowerCase();
        const cls = s === "verified" ? "verified" : s === "rejected" ? "rejected" : "pending";
        const label = s === "verified" ? "Verified" : s === "rejected" ? "Rejected" : "Pending";
        return `<span class="status-badge ${cls}">${label}</span>`;
    }

    function renderTrack(order) {
        if (!trackResult) return;
        trackResult.hidden = false;
        trackResult.innerHTML = `
            <h4><i class="fa-solid fa-clipboard-list"></i> Order ${escapeHtml(order.orderId)}</h4>
            <div class="track-row"><span>Status</span><strong>${statusBadge(order.status)}</strong></div>
            <div class="track-row"><span>Package</span><strong>${Number(order.uc).toLocaleString()} UC</strong></div>
            <div class="track-row"><span>Amount</span><strong>${money(order.amount)}</strong></div>
            <div class="track-row"><span>Payment</span><strong>${escapeHtml(order.paymentMethod || "JazzCash")}</strong></div>
            <div class="track-row"><span>Placed on</span><strong>${new Date(order.createdAt).toLocaleString()}</strong></div>
            <div class="track-row"><span>Player ID</span><strong>${escapeHtml(order.playerId)}</strong></div>
            <p class="form-help" style="margin-top:14px">
                <i class="fa-solid fa-circle-info"></i> Status changes from Pending to Verified only after the store owner confirms your JazzCash payment.
            </p>`;
    }

    if (trackForm) {
        trackForm.addEventListener("submit", (e) => {
            e.preventDefault();
            const input = document.getElementById("track-id");
            const id = (input?.value || "").trim().toUpperCase();
            if (!id) {
                toast("Enter your Order ID", "error");
                return;
            }

            const local = loadOrders().find((o) => o.orderId.toUpperCase() === id);
            if (local) {
                renderTrack(local);
                return;
            }

            const apiBase = (CFG.apiBase || "").replace(/\/$/, "");
            if (apiBase) {
                fetch(`${apiBase}/api/orders/${encodeURIComponent(id)}`)
                    .then((r) => (r.ok ? r.json() : null))
                    .then((data) => {
                        if (data) renderTrack(data);
                        else showNotFound();
                    })
                    .catch(() => showNotFound());
            } else {
                showNotFound();
            }
        });
    }

    function showNotFound() {
        if (!trackResult) return;
        trackResult.hidden = false;
        trackResult.innerHTML = `
            <p class="track-notfound">
                <i class="fa-solid fa-circle-exclamation"></i>
                No order found for that ID on this device.<br>
                Orders placed here are stored in this browser. Ask support on WhatsApp if you placed the order from another device.
            </p>`;
    }

    // -----------------------------------------------------------
    // 9. Legal modals
    // -----------------------------------------------------------
    const privacyModal = document.getElementById("privacy-modal");
    const termsModal = document.getElementById("terms-modal");

    function openModal(m) {
        if (!m) return;
        m.classList.add("open");
        document.body.style.overflow = "hidden";
    }
    function closeModal(m) {
        if (!m) return;
        m.classList.remove("open");
        document.body.style.overflow = "auto";
    }

    const openPrivacy = document.getElementById("open-privacy");
    const openTerms = document.getElementById("open-terms");
    if (openPrivacy) openPrivacy.addEventListener("click", (e) => { e.preventDefault(); openModal(privacyModal); });
    if (openTerms) openTerms.addEventListener("click", (e) => { e.preventDefault(); openModal(termsModal); });

    [["close-privacy-modal", privacyModal], ["close-terms-modal", termsModal]].forEach(([id, modal]) => {
        const btn = document.getElementById(id);
        if (btn) btn.addEventListener("click", () => closeModal(modal));
    });

    [privacyModal, termsModal].forEach((m) => {
        if (!m) return;
        m.addEventListener("click", (e) => {
            if (e.target === m) closeModal(m);
        });
    });

    document.addEventListener("keydown", (e) => {
        if (e.key !== "Escape") return;
        [privacyModal, termsModal].forEach((m) => {
            if (m && m.classList.contains("open")) closeModal(m);
        });
    });
})();
