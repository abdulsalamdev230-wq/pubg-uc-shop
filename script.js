/**
 * UC Store - Main Script
 * Version: 1.0.0
 * Author: Antigravity AI
 */

// Configuration: Edit your WhatsApp receiving number here (include country code, without '+' or '00')
const WHATSAPP_NUMBER = "923107817304";

document.addEventListener("DOMContentLoaded", () => {
    // -------------------------------------------------------------
    // 1. DOM Elements
    // -------------------------------------------------------------
    const header = document.getElementById("header");
    const navMenu = document.getElementById("nav-menu");
    const hamburger = document.getElementById("hamburger-menu");
    const navLinks = document.querySelectorAll(".nav-link");
    const scrollToTopBtn = document.getElementById("scroll-to-top-btn");

    // Modal elements
    const checkoutModal = document.getElementById("checkout-modal");
    const closeCheckoutBtn = document.getElementById("close-checkout");
    const selectedPackageSummary = document.getElementById("selected-package-summary");
    const checkoutForm = document.getElementById("checkout-form");
    const playerIdInput = document.getElementById("player-id");
    const playerIdError = document.getElementById("player-id-error");

    // Legal Modals
    const privacyModal = document.getElementById("privacy-modal");
    const termsModal = document.getElementById("terms-modal");
    const openPrivacyBtn = document.getElementById("open-privacy");
    const openTermsBtn = document.getElementById("open-terms");
    const closePrivacyBtn = document.getElementById("close-privacy-modal");
    const closeTermsBtn = document.getElementById("close-terms-modal");

    // Order state variables
    let selectedPackageUC = "";
    let selectedPackagePrice = "";

    // -------------------------------------------------------------
    // 2. Mobile Menu Navigation (Hamburger Toggle)
    // -------------------------------------------------------------
    const toggleMobileMenu = () => {
        hamburger.classList.toggle("active");
        navMenu.classList.toggle("active");
    };

    const closeMobileMenu = () => {
        hamburger.classList.remove("active");
        navMenu.classList.remove("active");
    };

    hamburger.addEventListener("click", toggleMobileMenu);

    // Close menu when a link is clicked
    navLinks.forEach(link => {
        link.addEventListener("click", () => {
            closeMobileMenu();
            
            // Set active class visually on click
            navLinks.forEach(item => item.classList.remove("active"));
            link.classList.add("active");
        });
    });

    // -------------------------------------------------------------
    // 3. Scroll Events: Sticky Header & Scroll-to-Top Button
    // -------------------------------------------------------------
    window.addEventListener("scroll", () => {
        // Sticky Header height shift
        if (window.scrollY > 50) {
            header.classList.add("scrolled");
        } else {
            header.classList.remove("scrolled");
        }

        // Scroll to Top visibility
        if (window.scrollY > 400) {
            scrollToTopBtn.classList.add("show");
        } else {
            scrollToTopBtn.classList.remove("show");
        }
    });

    // Scroll back to top
    scrollToTopBtn.addEventListener("click", () => {
        window.scrollTo({
            top: 0,
            behavior: "smooth"
        });
    });

    // -------------------------------------------------------------
    // 4. Scroll Reveal Animations (Intersection Observer)
    // -------------------------------------------------------------
    const revealCallback = (entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add("active");
                // Stop observing once animated
                observer.unobserve(entry.target);
            }
        });
    };

    const revealObserver = new IntersectionObserver(revealCallback, {
        root: null, // viewport
        threshold: 0.15, // trigger when 15% visible
        rootMargin: "0px 0px -50px 0px" // offset trigger slightly before element is seen
    });

    const elementsToReveal = document.querySelectorAll(".scroll-reveal");
    elementsToReveal.forEach(el => revealObserver.observe(el));

    // Active Navigation Link Highlighting on Scroll
    const sections = document.querySelectorAll("section[id]");
    const navHighlighter = () => {
        let scrollY = window.pageYOffset;
        
        sections.forEach(current => {
            const sectionHeight = current.offsetHeight;
            const sectionTop = current.offsetTop - 120;
            const sectionId = current.getAttribute("id");
            
            if (scrollY > sectionTop && scrollY <= sectionTop + sectionHeight) {
                const targetLink = document.querySelector(`.nav-menu a[href*=${sectionId}]`);
                if (targetLink) {
                    navLinks.forEach(link => link.classList.remove("active"));
                    targetLink.classList.add("active");
                }
            }
        });
    };
    window.addEventListener("scroll", navHighlighter);

    // -------------------------------------------------------------
    // 5. Checkout Modal Flow
    // -------------------------------------------------------------
    const openCheckoutModal = (uc, price) => {
        selectedPackageUC = uc;
        selectedPackagePrice = price;
        selectedPackageSummary.textContent = `${uc} UC - Rs. ${parseInt(price).toLocaleString()}`;
        
        // Reset form error & inputs
        playerIdInput.value = "";
        playerIdError.classList.remove("visible");
        playerIdInput.style.borderColor = "var(--border-color)";
        
        checkoutModal.classList.add("open");
        document.body.style.overflow = "hidden"; // Prevent background scrolling
    };

    const closeCheckoutModal = () => {
        checkoutModal.classList.remove("open");
        document.body.style.overflow = "auto";
    };

    // Attach click events to all "Buy Now" buttons
    const buyBtns = document.querySelectorAll(".buy-btn");
    buyBtns.forEach(btn => {
        btn.addEventListener("click", (e) => {
            const uc = btn.getAttribute("data-uc");
            const price = btn.getAttribute("data-price");
            openCheckoutModal(uc, price);
        });
    });

    closeCheckoutBtn.addEventListener("click", closeCheckoutModal);

    // Close modal if user clicks on the overlay background
    checkoutModal.addEventListener("click", (e) => {
        if (e.target === checkoutModal) {
            closeCheckoutModal();
        }
    });

    // -------------------------------------------------------------
    // 6. WhatsApp URL Generation & Validation
    // -------------------------------------------------------------
    checkoutForm.addEventListener("submit", (e) => {
        e.preventDefault();
        
        const playerId = playerIdInput.value.trim();
        const paymentMethod = document.querySelector('input[name="payment-method"]:checked').value;
        
        // Validation: PUBG Player ID is typically between 8 to 12 numerical digits
        const idRegex = /^\d{8,12}$/;
        
        if (!idRegex.test(playerId)) {
            playerIdError.classList.add("visible");
            playerIdInput.style.borderColor = "#ff3333";
            playerIdInput.focus();
            return;
        } else {
            playerIdError.classList.remove("visible");
            playerIdInput.style.borderColor = "var(--accent-green)";
        }

        // Set Loading state on Submit Button
        const submitBtn = document.getElementById("modal-submit-btn");
        const originalBtnText = submitBtn.innerHTML;
        submitBtn.disabled = true;
        submitBtn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Saving Order...`;

        // Database payload
        const payload = {
            player_id: playerId,
            uc_amount: parseInt(selectedPackageUC),
            price: parseInt(selectedPackagePrice),
            payment_method: paymentMethod
        };

        // Post order details to SQLite database
        fetch("/api/orders", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(payload)
        })
        .then(response => {
            if (!response.ok) {
                throw new Error("Server error logging order");
            }
            return response.json();
        })
        .then(data => {
            console.log("Order logged in database successfully:", data);
            proceedToWhatsApp(playerId, paymentMethod);
        })
        .catch(err => {
            console.warn("Database registration failed. Proceeding with WhatsApp redirect. Error:", err);
            // Fallback: Proceed with WhatsApp purchase even if DB logging fails
            proceedToWhatsApp(playerId, paymentMethod);
        })
        .finally(() => {
            // Restore button state
            submitBtn.disabled = false;
            submitBtn.innerHTML = originalBtnText;
            closeCheckoutModal();
        });
    });

    // Helper function to build message and open WhatsApp
    function proceedToWhatsApp(playerId, paymentMethod) {
        const message = `Hi UC Store,\n\nI would like to order a UC Package:\n` +
                        `• *Package:* ${selectedPackageUC} UC\n` +
                        `• *Price:* Rs. ${parseInt(selectedPackagePrice).toLocaleString()}\n` +
                        `• *PUBG Player ID:* ${playerId}\n` +
                        `• *Payment Method:* ${paymentMethod}\n\n` +
                        `Please share the payment account details so I can complete the transfer. Thanks!`;
        
        const whatsappUrl = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
        window.open(whatsappUrl, "_blank");
    }

    // Clean error state when user types
    playerIdInput.addEventListener("input", () => {
        if (playerIdInput.value.trim().length > 0) {
            playerIdError.classList.remove("visible");
            playerIdInput.style.borderColor = "var(--border-color)";
        }
    });

    // -------------------------------------------------------------
    // 7. Legal Modals (Privacy & Terms)
    // -------------------------------------------------------------
    const openModal = (modal) => {
        modal.classList.add("open");
        document.body.style.overflow = "hidden";
    };

    const closeModal = (modal) => {
        modal.classList.remove("open");
        document.body.style.overflow = "auto";
    };

    openPrivacyBtn.addEventListener("click", (e) => {
        e.preventDefault();
        openModal(privacyModal);
    });

    openTermsBtn.addEventListener("click", (e) => {
        e.preventDefault();
        openModal(termsModal);
    });

    closePrivacyBtn.addEventListener("click", () => closeModal(privacyModal));
    closeTermsBtn.addEventListener("click", () => closeModal(termsModal));

    // Close legal modals on background click
    window.addEventListener("click", (e) => {
        if (e.target === privacyModal) {
            closeModal(privacyModal);
        }
        if (e.target === termsModal) {
            closeModal(termsModal);
        }
    });
});
