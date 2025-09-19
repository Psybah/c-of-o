window.initModal = function(){};
// Prevent double submits without disabling the button (preserves user gesture)
window.__isPaying = false;

function updatePaymentSummary() {
    const selectEl = document.getElementById('productNameSelect');
    const name = (selectEl && selectEl.value) || document.getElementById('productName')?.value || '';
    // Price now derives from selected service (data-price)
    const priceStr = (function(){
        if (selectEl) {
            const opt = selectEl.options[selectEl.selectedIndex];
            if (opt && opt.dataset && opt.dataset.price) return opt.dataset.price;
        }
        return document.getElementById('productPrice')?.value || '0';
    })();
    // Reflect derived price back into the disabled input so downstream reads work
    const priceInput = document.getElementById('productPrice');
    if (priceInput) priceInput.value = priceStr || '';
    const qtyStr = document.getElementById('productQuantity')?.value || '1';
    const price = Number(priceStr) || 0;
    const qty = Math.max(1, Number(qtyStr) || 1);
    const total = price * qty;

    const fmt = new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN' });
    const el = (id, val) => { const n = document.getElementById(id); if (n) n.textContent = val; };
    el('summaryName', name || '—');
    el('summaryPrice', fmt.format(price));
    el('summaryQuantity', String(qty));
    el('summaryTotal', fmt.format(total));
    // Update dynamic pay button label
    const payBtn = document.getElementById('payBtn');
    if (payBtn) payBtn.innerText = 'Pay ' + fmt.format(total);
}

function openPaymentPortal() {
	const modal = document.getElementById('paymentModal');
	// Close mobile drawer if open
	const drawer = document.getElementById('mobile-menu');
	const backdrop = document.getElementById('drawer-backdrop');
	if (drawer && drawer.classList.contains('open')) {
		drawer.classList.remove('open');
		if (backdrop) backdrop.classList.remove('visible');
	}
	if (modal) {
		modal.classList.add('active');
		document.body.style.overflow = 'hidden';
		// initialize or refresh summary on open
		updatePaymentSummary();
	}
}

function closePaymentModal() {
	const modal = document.getElementById('paymentModal');
	if (modal) {
		modal.classList.remove('active');
		document.body.style.overflow = 'auto';
	}
}

function validateApplicationForm(formData) {
    const requiredFields = ['fullName', 'email', 'phone', 'propertyAddress', 'landSize', 'productPrice', 'productQuantity'];
	const errors = [];
	
	// Clear previous errors
	requiredFields.forEach(field => {
		const errorEl = document.getElementById(field + '-error');
		const inputEl = document.getElementById(field);
		if (errorEl) errorEl.classList.remove('show');
		if (inputEl) inputEl.classList.remove('error');
	});
	
    requiredFields.forEach(field => {
        const value = formData[field] || '';
        const errorEl = document.getElementById(field + '-error');
        const inputEl = document.getElementById(field);
        if (!value.toString().trim()) {
            const fieldName = field.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
            errors.push(`${fieldName} is required`);
            if (errorEl) { errorEl.textContent = `${fieldName} is required`; errorEl.classList.add('show'); }
            if (inputEl) inputEl.classList.add('error');
        }
    });

    // Validate service select
    const serviceSelect = document.getElementById('productNameSelect');
    const serviceErr = document.getElementById('productName-error');
    if (serviceSelect && !serviceSelect.value) {
        if (serviceErr) { serviceErr.textContent = 'Service is required'; serviceErr.classList.add('show'); }
        serviceSelect.classList.add('error');
        errors.push('Service is required');
    }
	
	if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
		errors.push('Please enter a valid email address');
		const errorEl = document.getElementById('email-error');
		const inputEl = document.getElementById('email');
		if (errorEl) {
			errorEl.textContent = 'Please enter a valid email address';
			errorEl.classList.add('show');
		}
		if (inputEl) inputEl.classList.add('error');
	}
	
	if (formData.phone && !/^[\+]?\d[\d\s\-\(\)]{9,}$/.test(formData.phone)) {
		errors.push('Please enter a valid phone number');
		const errorEl = document.getElementById('phone-error');
		const inputEl = document.getElementById('phone');
		if (errorEl) {
			errorEl.textContent = 'Please enter a valid phone number';
			errorEl.classList.add('show');
		}
		if (inputEl) inputEl.classList.add('error');
	}

    // product numeric validations
    const priceNum = Number(formData.productPrice);
    if (!Number.isFinite(priceNum) || priceNum <= 0) {
        const errorEl = document.getElementById('productPrice-error');
        const inputEl = document.getElementById('productPrice');
        if (errorEl) { errorEl.textContent = 'Enter a valid price'; errorEl.classList.add('show'); }
        if (inputEl) inputEl.classList.add('error');
        errors.push('Enter a valid price');
    }
    const qtyNum = Number(formData.productQuantity);
    if (!Number.isInteger(qtyNum) || qtyNum < 1) {
        const errorEl = document.getElementById('productQuantity-error');
        const inputEl = document.getElementById('productQuantity');
        if (errorEl) { errorEl.textContent = 'Enter a valid quantity (>=1)'; errorEl.classList.add('show'); }
        if (inputEl) inputEl.classList.add('error');
        errors.push('Enter a valid quantity');
    }
	
	return { isValid: errors.length === 0, errors };
}

function processPayment() {
    const serviceSelect = document.getElementById('productNameSelect');
    const selectedService = serviceSelect && serviceSelect.value ? serviceSelect.value : '';

    const formData = {
		fullName: document.getElementById('fullName')?.value || '',
		email: document.getElementById('email')?.value || '',
		phone: document.getElementById('phone')?.value || '',
		propertyAddress: document.getElementById('propertyAddress')?.value || '',
        landSize: document.getElementById('landSize')?.value || '',
        productName: selectedService || document.getElementById('productName')?.value || '',
        productPrice: document.getElementById('productPrice')?.value || '',
		productQuantity: document.getElementById('productQuantity')?.value || '1',
		productDescription: document.getElementById('productDescription')?.value || ''
	};
	
	const validation = validateApplicationForm(formData);
	if (!validation.isValid) {
		return; // Errors are now shown inline
	}

	// Non-blocking loading state (do not disable or delay checkout)
	if (!window.__isPaying) {
		window.__isPaying = true;
		const btn = document.getElementById('payBtn');
		if (btn) {
			btn.classList.add('is-loading');
			btn.dataset.label = btn.innerText;
			btn.innerText = 'Processing...';
		}
	}
	
	// Initialize BluePay and process payment
	if (typeof BluePay !== 'undefined') {
		console.log('BluePay loaded successfully');
		BluePay.init('blue_test_289de48ef5e64');
		console.log('Processing payment for ₦48,000');
		BluePay.checkout({
			amount: String(Number(formData.productPrice) * Math.max(1, Number(formData.productQuantity) || 1)),
			productName: formData.productName,
			price: String(Number(formData.productPrice)),
			quantity: String(Number(formData.productQuantity) || 1),
			description: formData.productDescription || undefined,
			payerEmail: formData.email,
			cardHolderName: formData.fullName,
			payerPhoneNumber: formData.phone,
			successUrl: '/success.html',
			failureUrl: '/failure.html'
		});
	} else {
		console.error('BluePay not loaded - check script source');
		alert('Payment gateway not available. Please try again later.');
	}

	// Soft reset after 12s in case control returns
	setTimeout(function(){
		const btn = document.getElementById('payBtn');
		if (btn && btn.classList.contains('is-loading')) {
			btn.classList.remove('is-loading');
			if (btn.dataset.label) btn.innerText = btn.dataset.label;
		}
		window.__isPaying = false;
	}, 12000);
}

function formatCurrency(amount) {
	return new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN' }).format(amount);
}

// Close modal when clicking outside
document.addEventListener('click', function(e) {
	const modal = document.getElementById('paymentModal');
	if (e.target === modal) {
		closePaymentModal();
	}
});

// Close modal with Escape key
document.addEventListener('keydown', function(e) {
	if (e.key === 'Escape') {
		closePaymentModal();
	}
});

// Live update summary when product fields change
document.addEventListener('input', function(e) {
    const id = (e.target && e.target.id) || '';
    if (id === 'productName' || id === 'productNameSelect' || id === 'productPrice' || id === 'productQuantity') {
        updatePaymentSummary();
    }
});

