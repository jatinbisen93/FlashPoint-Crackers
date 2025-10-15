// Admin dashboard logic
let currentUser = null;
let products = [];
let currentFilter = 'all'; // Track current filter
let posBag = {}; // { [productId]: quantity }
let posDiscount = 0; // currency amount

// Check authentication
auth.onAuthStateChanged(async (user) => {
    if (!user) {
        window.location.href = 'login.html';
        return;
    }
    
    currentUser = user;
    const uid = user.uid;
    
    // Check if admin role
    const roleSnapshot = await database.ref(`users/${uid}/role`).once('value');
    if (roleSnapshot.val() !== 'admin') {
        window.location.href = 'login.html';
        return;
    }
    
    // Display admin email
    const userData = await database.ref(`users/${uid}`).once('value');
    const adminEmailEl = document.getElementById('admin-email');
    if (adminEmailEl) {
        adminEmailEl.textContent = userData.val().email;
    }
    
    // Initialize dashboard after DOM is ready
    setTimeout(() => {
        loadProducts();
        setupEventListeners();
    }, 100);
});

// Setup event listeners
function setupEventListeners() {
    // Mobile menu
    const hamburger = document.getElementById('hamburger');
    const navMenu = document.getElementById('nav-menu');
    
    if (hamburger && navMenu) {
        hamburger.addEventListener('click', () => {
            hamburger.classList.toggle('active');
            navMenu.classList.toggle('active');
        });
    }
    
    // Add product form
    const productForm = document.getElementById('product-form');
    if (productForm) {
        productForm.addEventListener('submit', addProduct);
    }
    
    // Edit product form
    const editForm = document.getElementById('edit-form');
    if (editForm) {
        editForm.addEventListener('submit', updateProduct);
    }
    
    // Close modals
    const closeEdit = document.getElementById('close-edit');
    if (closeEdit) {
        closeEdit.addEventListener('click', () => {
            const modal = document.getElementById('edit-modal');
            if (modal) modal.classList.add('hidden');
        });
    }
    
    const closeNotifications = document.getElementById('close-notifications');
    if (closeNotifications) {
        closeNotifications.addEventListener('click', () => {
            const modal = document.getElementById('notifications-modal');
            if (modal) modal.classList.add('hidden');
        });
    }
    
    // Logout
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            auth.signOut().then(() => {
                window.location.href = 'login.html';
            });
        });
    }
}

// Show admin section
function showAdminSection(sectionId) {
    // Remove active class from all sections
    document.querySelectorAll('.admin-content-section').forEach(section => {
        section.classList.remove('active');
    });
    
    // Remove active class from all nav links
    document.querySelectorAll('.nav-link').forEach(link => {
        link.classList.remove('active');
    });
    
    // Show selected section
    const section = document.getElementById(sectionId);
    if (section) {
        section.classList.add('active');
    }
    
    // Add active class to clicked nav link
    const clickedLink = document.querySelector(`[onclick*="${sectionId}"]`);
    if (clickedLink) {
        clickedLink.classList.add('active');
    }
    
    // Update stats when switching to dashboard
    if (sectionId === 'dashboard') {
        updateStats();
        checkLowStock();
    }
    
    // Update products list when switching to products section
    if (sectionId === 'products-section') {
        displayProducts(currentFilter);
    }
    
    // Close mobile menu
    const hamburger = document.getElementById('hamburger');
    const navMenu = document.getElementById('nav-menu');
    if (hamburger && navMenu) {
        hamburger.classList.remove('active');
        navMenu.classList.remove('active');
    }
}

// Load products with real-time updates
function loadProducts() {
    console.log('Setting up products listener...');
    
    // Remove any existing listener to avoid duplicates
    database.ref('products').off();
    
    // Set up real-time listener
    database.ref('products').on('value', (snapshot) => {
        console.log('Products snapshot received');
        
        products = [];
        const data = snapshot.val();
        
        if (data) {
            Object.keys(data).forEach(key => {
                products.push({
                    id: key,
                    ...data[key]
                });
            });
        }
        
        console.log('Products loaded:', products.length, products);
        
        // CRITICAL: Always update stats in real-time whenever products change
        updateStats();
        checkLowStock();
        
        // Check which section is active and update accordingly
        const productsSection = document.getElementById('products-section');
        const dashboard = document.getElementById('dashboard');
        
        // Always prepare the product display data
        if (productsSection) {
            // If products section is active, display filtered products
            if (productsSection.classList.contains('active')) {
                displayProducts(currentFilter);
            }
        }
        
        // If dashboard is active and this is first load, show all products by default
        if (dashboard && dashboard.classList.contains('active') && products.length > 0) {
            // Make sure products list is ready for when user switches to products section
            const listDiv = document.getElementById('admin-products-list');
            if (listDiv && listDiv.innerHTML === '') {
                // Pre-render products so they're ready when section is shown
                displayFilteredProducts(products);
            }
        }
    }, (error) => {
        console.error('Error loading products:', error);
        showMessage('Error loading products. Please refresh the page.', 'error');
    });
}

// Filter products
function filterProducts(filterType) {
    currentFilter = filterType;
    
    // Switch to products section
    showAdminSection('products-section');
    
    // Update title based on filter
    const titleElement = document.getElementById('products-title');
    let filteredProducts = [];
    
    switch(filterType) {
        case 'all':
            if (titleElement) titleElement.textContent = 'All Products';
            filteredProducts = products;
            break;
        case 'low':
            if (titleElement) titleElement.textContent = 'Low Stock Products';
            filteredProducts = products.filter(p => {
                const qty = p.quantity !== undefined ? p.quantity : (p.qty !== undefined ? p.qty : 0);
                return qty > 0 && qty < 5;
            });
            break;
        case 'instock':
            if (titleElement) titleElement.textContent = 'In Stock Products';
            filteredProducts = products.filter(p => {
                const qty = p.quantity !== undefined ? p.quantity : (p.qty !== undefined ? p.qty : 0);
                return qty >= 5;
            });
            break;
        case 'outofstock':
            if (titleElement) titleElement.textContent = 'Out of Stock Products';
            filteredProducts = products.filter(p => {
                const qty = p.quantity !== undefined ? p.quantity : (p.qty !== undefined ? p.qty : 0);
                return qty === 0;
            });
            break;
        default:
            if (titleElement) titleElement.textContent = 'All Products';
            filteredProducts = products;
    }
    
    displayFilteredProducts(filteredProducts);
}

// Display products
function displayProducts(filterType = 'all') {
    filterProducts(filterType);
}

// Display filtered products
function displayFilteredProducts(filteredProducts) {
    const listDiv = document.getElementById('admin-products-list');
    const loading = document.getElementById('loading');
    
    if (!listDiv) {
        console.log('admin-products-list element not found');
        return;
    }
    
    if (loading) {
        loading.classList.add('hidden');
    }
    
    if (filteredProducts.length === 0) {
        let message = 'No products found';
        switch(currentFilter) {
            case 'low':
                message = 'No low stock products. All items are well stocked!';
                break;
            case 'instock':
                message = 'No products with sufficient stock.';
                break;
            case 'outofstock':
                message = 'No out of stock products. Great job keeping inventory!';
                break;
            default:
                message = 'No products yet. Add your first product!';
        }
        listDiv.innerHTML = `<div class="no-products"><i class="fas fa-box-open"></i><p>${message}</p></div>`;
        return;
    }
    
    listDiv.innerHTML = filteredProducts.map(product => {
        // Handle both 'quantity' and 'qty' field names
        const qty = product.quantity !== undefined ? product.quantity : (product.qty !== undefined ? product.qty : 0);
        const price = parseFloat(product.price) || 0;
        const name = product.name || 'Unnamed Product';
        const description = product.description || 'No description';
        const image = product.image || product.img || 'https://via.placeholder.com/300x150?text=No+Image';
        
        // Escape strings for HTML attributes
        const escapedName = name.replace(/'/g, '&#39;').replace(/"/g, '&quot;');
        const escapedId = product.id.replace(/'/g, '&#39;');
        
        return `
        <div class="admin-product-card">
            <img src="${image}" alt="${escapedName}" onerror="this.src='https://via.placeholder.com/300x150?text=No+Image'">
            <div class="admin-product-info">
                <div class="product-category">${product.category || 'Uncategorized'}</div>
                <h4>${name}</h4>
                <p class="product-desc">${description}</p>
                <div class="product-details">
                    <span class="price-tag">₹${price.toFixed(2)}</span>
                    <span class="stock-tag ${qty <= 0 ? 'out' : qty < 5 ? 'low' : ''}">
                        Stock: ${qty}
                    </span>
                </div>
            </div>
            <div class="admin-product-actions">
                <button class="btn-edit" onclick="editProduct('${escapedId}')">
                    <i class="fas fa-edit"></i> Edit
                </button>
                <button class="btn-delete" onclick="deleteProduct('${escapedId}', '${escapedName}')">
                    <i class="fas fa-trash"></i> Delete
                </button>
                <div class="qty-update">
                    <input type="number" id="qty-${product.id}" min="0" placeholder="Add qty" class="qty-input">
                    <button class="btn-add-qty" onclick="addQuantity('${escapedId}')">
                        <i class="fas fa-plus"></i>
                    </button>
                </div>
				<button class="btn-primary" onclick="addToBag('${escapedId}')" ${qty <= 0 ? 'disabled' : ''}>
					<i class="fas fa-shopping-basket"></i> Add to Bag
				</button>
            </div>
        </div>
    `;
    }).join('');
}

// POS: Add product to bag
function addToBag(productId) {
	const product = products.find(p => p.id === productId);
	if (!product) return;
	const availableQty = product.quantity !== undefined ? product.quantity : (product.qty !== undefined ? product.qty : 0);
	const currentQty = posBag[productId] || 0;
	if (availableQty <= 0 || currentQty >= availableQty) {
		showMessage('Insufficient stock', 'error');
		return;
	}
	posBag[productId] = currentQty + 1;
	renderPosBag();
}

// POS: Clear bag
function clearPosBag() {
	posBag = {};
	renderPosBag();
}

// POS: Change quantity
function changeBagQty(productId, delta) {
	const product = products.find(p => p.id === productId);
	if (!product) return;
	const availableQty = product.quantity !== undefined ? product.quantity : (product.qty !== undefined ? product.qty : 0);
	const currentQty = posBag[productId] || 0;
	let nextQty = currentQty + delta;
	if (nextQty <= 0) {
		delete posBag[productId];
	} else if (nextQty > availableQty) {
		nextQty = availableQty;
		posBag[productId] = nextQty;
		showMessage(`Only ${availableQty} available`, 'error');
	} else {
		posBag[productId] = nextQty;
	}
	renderPosBag();
}

// POS: Remove line
function removeFromBag(productId) {
	delete posBag[productId];
	renderPosBag();
}

// POS: Render bag and totals
function renderPosBag() {
	const bagList = document.getElementById('pos-bag-list');
	const subtotalEl = document.getElementById('pos-subtotal');
	const discountEl = document.getElementById('pos-discount-display');
	const totalEl = document.getElementById('pos-total');
	const sellBtn = document.getElementById('pos-sell-btn');
	const discountInput = document.getElementById('pos-discount');
	if (!bagList || !subtotalEl || !discountEl || !totalEl || !sellBtn) return;

	posDiscount = 0;
	if (discountInput) {
		const val = parseFloat(discountInput.value);
		posDiscount = isNaN(val) || val < 0 ? 0 : val;
	}

	const ids = Object.keys(posBag);
	if (ids.length === 0) {
		bagList.innerHTML = '<div class="empty-state"><i class="fas fa-shopping-basket"></i><p>No items in bag</p></div>';
		subtotalEl.textContent = '₹0.00';
		discountEl.textContent = '-₹0.00';
		totalEl.textContent = '₹0.00';
		sellBtn.disabled = true;
		return;
	}

	let subtotal = 0;
	const rows = ids.map(productId => {
		const product = products.find(p => p.id === productId);
		if (!product) return '';
		const availableQty = product.quantity !== undefined ? product.quantity : (product.qty !== undefined ? product.qty : 0);
		const qty = Math.min(posBag[productId] || 0, availableQty);
		const price = parseFloat(product.price) || 0;
		const lineTotal = price * qty;
		subtotal += lineTotal;
		const escapedName = (product.name || 'Unnamed Product').replace(/'/g, '&#39;').replace(/"/g, '&quot;');
		return `
			<div class="pos-item">
				<div class="pos-item-info">
					<strong>${escapedName}</strong>
					<span>₹${price.toFixed(2)} × ${qty}</span>
					<span class="pos-stock">Stock: ${availableQty}</span>
				</div>
				<div class="pos-item-actions">
					<div class="quantity-controls">
						<button onclick="changeBagQty('${productId}', -1)">-</button>
						<span>${qty}</span>
						<button onclick="changeBagQty('${productId}', 1)" ${qty >= availableQty ? 'disabled' : ''}>+</button>
					</div>
					<div class="pos-line-total">₹${lineTotal.toFixed(2)}</div>
					<button class="btn-remove" onclick="removeFromBag('${productId}')"><i class="fas fa-trash"></i></button>
				</div>
			</div>
		`;
	}).join('');

	const discount = Math.min(posDiscount, subtotal);
	const total = Math.max(0, subtotal - discount);

	bagList.innerHTML = rows;
	subtotalEl.textContent = `₹${subtotal.toFixed(2)}`;
	discountEl.textContent = `-₹${discount.toFixed(2)}`;
	totalEl.textContent = `₹${total.toFixed(2)}`;
	sellBtn.disabled = total <= 0;
}

// POS: Sell flow
async function sellBag() {
	const ids = Object.keys(posBag);
	if (ids.length === 0) return;

	let subtotal = 0;
	const updates = {};
	const saleItems = [];
	for (const productId of ids) {
		const product = products.find(p => p.id === productId);
		if (!product) continue;
		const availableQty = product.quantity !== undefined ? product.quantity : (product.qty !== undefined ? product.qty : 0);
		const qty = Math.min(posBag[productId] || 0, availableQty);
		if (qty <= 0) continue;
		const price = parseFloat(product.price) || 0;
		updates[`products/${productId}/quantity`] = availableQty - qty;
		subtotal += price * qty;
		saleItems.push({ id: productId, name: product.name || 'Unnamed Product', qty, price });
	}

	if (saleItems.length === 0) {
		showMessage('No available items to sell', 'error');
		return;
	}

	const discountInput = document.getElementById('pos-discount');
	let discount = 0;
	if (discountInput) {
		const val = parseFloat(discountInput.value);
		discount = isNaN(val) || val < 0 ? 0 : Math.min(val, subtotal);
	}
	const total = Math.max(0, subtotal - discount);

	try {
		await database.ref().update(updates);
		const saleRef = database.ref('sales').push();
		await saleRef.set({
			items: saleItems,
			subtotal,
			discount,
			total,
			adminUid: currentUser ? currentUser.uid : null,
			adminEmail: currentUser && currentUser.email ? currentUser.email : null,
			timestamp: firebase.database.ServerValue.TIMESTAMP
		});
		clearPosBag();
		if (discountInput) discountInput.value = '';
		renderPosBag();
		showMessage('Sale recorded successfully', 'success');
	} catch (error) {
		console.error('Sell error:', error);
		showMessage('Error processing sale', 'error');
	}
}

// Add product
async function addProduct(e) {
    e.preventDefault();
    
    const name = document.getElementById('product-name').value.trim();
    const category = document.getElementById('product-category').value;
    const description = document.getElementById('product-description').value.trim();
    const price = parseFloat(document.getElementById('product-price').value);
    const quantity = parseInt(document.getElementById('product-quantity').value);
    const image = document.getElementById('product-image').value.trim();
    const messageDiv = document.getElementById('form-message');
    
    // Validation
    if (!name || !category || !description || isNaN(price) || isNaN(quantity)) {
        if (messageDiv) {
            messageDiv.className = 'form-message error';
            messageDiv.textContent = 'Please fill in all fields correctly.';
        }
        return;
    }
    
    try {
        await database.ref('products').push({
            name,
            category,
            description,
            price,
            quantity,
            image: image || 'https://via.placeholder.com/300x150?text=No+Image',
            createdAt: firebase.database.ServerValue.TIMESTAMP
        });
        
        if (messageDiv) {
            messageDiv.className = 'form-message success';
            messageDiv.textContent = 'Product added successfully!';
        }
        document.getElementById('product-form').reset();
        
        setTimeout(() => {
            if (messageDiv) messageDiv.textContent = '';
        }, 3000);
    } catch (error) {
        console.error('Error adding product:', error);
        if (messageDiv) {
            messageDiv.className = 'form-message error';
            messageDiv.textContent = 'Error adding product. Please try again.';
        }
    }
}

// Edit product
function editProduct(productId) {
    const product = products.find(p => p.id === productId);
    if (!product) return;
    
    // Handle both 'quantity' and 'qty' field names
    const qty = product.quantity !== undefined ? product.quantity : (product.qty !== undefined ? product.qty : 0);
    const name = product.name || '';
    const description = product.description || '';
    const price = product.price || 0;
    const category = product.category || '';
    const image = product.image || product.img || '';
    
    const editModal = document.getElementById('edit-modal');
    const editProductId = document.getElementById('edit-product-id');
    const editProductName = document.getElementById('edit-product-name');
    const editProductCategory = document.getElementById('edit-product-category');
    const editProductDescription = document.getElementById('edit-product-description');
    const editProductPrice = document.getElementById('edit-product-price');
    const editProductQuantity = document.getElementById('edit-product-quantity');
    const editProductImage = document.getElementById('edit-product-image');
    
    if (editProductId) editProductId.value = productId;
    if (editProductName) editProductName.value = name;
    if (editProductCategory) editProductCategory.value = category;
    if (editProductDescription) editProductDescription.value = description;
    if (editProductPrice) editProductPrice.value = price;
    if (editProductQuantity) editProductQuantity.value = qty;
    if (editProductImage) editProductImage.value = image;
    
    if (editModal) {
        editModal.classList.remove('hidden');
    }
}

// Update product
async function updateProduct(e) {
    e.preventDefault();
    
    const productId = document.getElementById('edit-product-id').value;
    const name = document.getElementById('edit-product-name').value.trim();
    const category = document.getElementById('edit-product-category').value;
    const description = document.getElementById('edit-product-description').value.trim();
    const price = parseFloat(document.getElementById('edit-product-price').value);
    const quantity = parseInt(document.getElementById('edit-product-quantity').value);
    const image = document.getElementById('edit-product-image').value.trim();
    
    // Validation
    if (!name || !category || !description || isNaN(price) || isNaN(quantity)) {
        showMessage('Please fill in all fields correctly', 'error');
        return;
    }
    
    try {
        await database.ref(`products/${productId}`).update({
            name,
            category,
            description,
            price,
            quantity,
            image: image || 'https://via.placeholder.com/300x150?text=No+Image'
        });
        
        showMessage('Product updated successfully!', 'success');
        const editModal = document.getElementById('edit-modal');
        if (editModal) {
            editModal.classList.add('hidden');
        }
    } catch (error) {
        console.error('Error updating product:', error);
        showMessage('Error updating product', 'error');
    }
}

// Delete product
async function deleteProduct(productId, productName) {
    // Unescape the product name for display
    const displayName = productName.replace(/&#39;/g, "'").replace(/&quot;/g, '"');
    
    if (!confirm(`Are you sure you want to delete "${displayName}"?`)) {
        return;
    }
    
    try {
        await database.ref(`products/${productId}`).remove();
        showMessage('Product deleted successfully!', 'success');
    } catch (error) {
        console.error('Error deleting product:', error);
        showMessage('Error deleting product', 'error');
    }
}

// Add quantity
async function addQuantity(productId) {
    const input = document.getElementById(`qty-${productId}`);
    if (!input) return;
    
    const addQty = parseInt(input.value);
    
    if (!addQty || addQty < 1) {
        showMessage('Please enter a valid quantity', 'error');
        return;
    }
    
    const product = products.find(p => p.id === productId);
    if (!product) return;
    
    try {
        // Handle both 'quantity' and 'qty' field names - use 'quantity' for consistency
        const currentQty = product.quantity !== undefined ? product.quantity : (product.qty !== undefined ? product.qty : 0);
        await database.ref(`products/${productId}/quantity`).set(currentQty + addQty);
        input.value = '';
        showMessage(`Added ${addQty} to stock`, 'success');
    } catch (error) {
        console.error('Error updating quantity:', error);
        showMessage('Error updating quantity', 'error');
    }
}

// Update stats with enhanced reliability
function updateStats() {
    // Ensure elements exist before updating
    const totalEl = document.getElementById('total-products');
    const lowStockEl = document.getElementById('low-stock-count');
    const inStockEl = document.getElementById('in-stock-count');
    const outOfStockEl = document.getElementById('out-of-stock-count');
    
    if (!totalEl || !lowStockEl || !inStockEl || !outOfStockEl) {
        console.log('Stats elements not found, will retry when DOM is ready...');
        return;
    }
    
    const totalProducts = products.length;
    
    // Handle both 'quantity' and 'qty' field names
    const lowStock = products.filter(p => {
        const qty = p.quantity !== undefined ? p.quantity : (p.qty !== undefined ? p.qty : 0);
        return qty > 0 && qty < 5;
    }).length;
    
    const inStock = products.filter(p => {
        const qty = p.quantity !== undefined ? p.quantity : (p.qty !== undefined ? p.qty : 0);
        return qty >= 5;
    }).length;
    
    const outOfStock = products.filter(p => {
        const qty = p.quantity !== undefined ? p.quantity : (p.qty !== undefined ? p.qty : 0);
        return qty === 0;
    }).length;
    
    // Update with animation
    animateCounter(totalEl, parseInt(totalEl.textContent) || 0, totalProducts);
    animateCounter(lowStockEl, parseInt(lowStockEl.textContent) || 0, lowStock);
    animateCounter(inStockEl, parseInt(inStockEl.textContent) || 0, inStock);
    animateCounter(outOfStockEl, parseInt(outOfStockEl.textContent) || 0, outOfStock);
    
    console.log('✅ Stats updated:', { 
        total: totalProducts, 
        low: lowStock, 
        inStock: inStock, 
        outOfStock: outOfStock,
        timestamp: new Date().toLocaleTimeString()
    });
}

// Animate counter for smooth transitions
function animateCounter(element, start, end) {
    if (start === end) {
        element.textContent = end;
        return;
    }
    
    const duration = 500; // milliseconds
    const steps = 20;
    const increment = (end - start) / steps;
    let current = start;
    let step = 0;
    
    const timer = setInterval(() => {
        step++;
        current += increment;
        
        if (step >= steps) {
            element.textContent = end;
            clearInterval(timer);
        } else {
            element.textContent = Math.round(current);
        }
    }, duration / steps);
}

// Check low stock
function checkLowStock() {
    const lowStockProducts = products.filter(p => {
        const qty = p.quantity !== undefined ? p.quantity : (p.qty !== undefined ? p.qty : 0);
        return qty < 5;
    });
    const badge = document.getElementById('notif-badge');
    
    if (badge) {
        if (lowStockProducts.length > 0) {
            badge.classList.remove('hidden');
        } else {
            badge.classList.add('hidden');
        }
    }
}

// Show notifications
function showNotifications() {
    const lowStockProducts = products.filter(p => {
        const qty = p.quantity !== undefined ? p.quantity : (p.qty !== undefined ? p.qty : 0);
        return qty < 5;
    });
    const listDiv = document.getElementById('notifications-list');
    const notificationsModal = document.getElementById('notifications-modal');
    
    if (!listDiv || !notificationsModal) return;
    
    if (lowStockProducts.length === 0) {
        listDiv.innerHTML = '<div class="no-notifications"><i class="fas fa-check-circle"></i><p>All products are sufficiently stocked!</p></div>';
    } else {
        listDiv.innerHTML = lowStockProducts.map(product => {
            const qty = product.quantity !== undefined ? product.quantity : (product.qty !== undefined ? product.qty : 0);
            const name = product.name || 'Unnamed Product';
            const escapedId = product.id.replace(/'/g, '&#39;');
            
            return `
            <div class="notification-item ${qty === 0 ? 'critical' : ''}">
                <i class="fas ${qty === 0 ? 'fa-times-circle' : 'fa-exclamation-triangle'}"></i>
                <div class="notification-info">
                    <h4>${name}</h4>
                    <p>${qty === 0 ? 'Out of stock' : `Only ${qty} left in stock`}</p>
                </div>
                <button class="btn-sm" onclick="editProduct('${escapedId}')">Update</button>
            </div>
        `;
        }).join('');
    }
    
    notificationsModal.classList.remove('hidden');
}

// Show message
function showMessage(message, type) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message-toast ${type}`;
    messageDiv.textContent = message;
    document.body.appendChild(messageDiv);
    
    setTimeout(() => {
        messageDiv.classList.add('show');
    }, 10);
    
    setTimeout(() => {
        messageDiv.classList.remove('show');
        setTimeout(() => messageDiv.remove(), 300);
    }, 3000);
}