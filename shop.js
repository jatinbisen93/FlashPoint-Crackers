// User shopping logic
let currentUser = null;
let products = [];
let cart = {};
let wishlist = {};

// Check authentication
auth.onAuthStateChanged(async (user) => {
    if (!user) {
        window.location.href = 'login.html';
        return;
    }
    
    currentUser = user;
    const uid = user.uid;
    
    // Check if user role
    const roleSnapshot = await database.ref(`users/${uid}/role`).once('value');
    if (roleSnapshot.val() !== 'user') {
        window.location.href = 'login.html';
        return;
    }
    
    loadProducts();
    loadCart();
    loadWishlist();
    setupEventListeners();
});

// Setup event listeners
function setupEventListeners() {
    // Mobile menu
    const hamburger = document.getElementById('hamburger');
    const navMenu = document.getElementById('nav-menu');
    
    hamburger.addEventListener('click', () => {
        hamburger.classList.toggle('active');
        navMenu.classList.toggle('active');
    });
    
    // Search
    document.getElementById('search-bar').addEventListener('input', (e) => {
        const term = e.target.value.toLowerCase();
        const filtered = products.filter(p => 
            p.name.toLowerCase().includes(term) || 
            p.description.toLowerCase().includes(term) ||
            (p.category && p.category.toLowerCase().includes(term))
        );
        displayProducts(filtered);
    });
    
    // Cart modal
    document.getElementById('cart-link').addEventListener('click', (e) => {
        e.preventDefault();
        document.getElementById('cart-modal').classList.remove('hidden');
        displayCart();
    });
    
    document.getElementById('close-cart').addEventListener('click', () => {
        document.getElementById('cart-modal').classList.add('hidden');
    });
    
    // Wishlist modal
    document.getElementById('wishlist-link').addEventListener('click', (e) => {
        e.preventDefault();
        document.getElementById('wishlist-modal').classList.remove('hidden');
        displayWishlist();
    });
    
    document.getElementById('close-wishlist').addEventListener('click', () => {
        document.getElementById('wishlist-modal').classList.add('hidden');
    });
    
    // Product detail modal
    document.getElementById('close-product').addEventListener('click', () => {
        document.getElementById('product-modal').classList.add('hidden');
    });
    
    // Checkout
    document.getElementById('checkout-btn').addEventListener('click', checkout);
    
    // Logout
    document.getElementById('logout-btn').addEventListener('click', () => {
        auth.signOut().then(() => {
            window.location.href = 'login.html';
        });
    });
}

// Load products
function loadProducts() {
    database.ref('products').on('value', (snapshot) => {
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
        
        displayProducts(products);
    });
}

// Display products
function displayProducts(productsToDisplay) {
    const grid = document.getElementById('products-grid');
    const loading = document.getElementById('loading');
    const noProducts = document.getElementById('no-products');
    
    loading.classList.add('hidden');
    
    if (productsToDisplay.length === 0) {
        grid.innerHTML = '';
        noProducts.classList.remove('hidden');
        return;
    }
    
    noProducts.classList.add('hidden');
    grid.innerHTML = productsToDisplay.map(product => {
        // Handle both 'quantity' and 'qty' field names
        const qty = product.quantity !== undefined ? product.quantity : (product.qty !== undefined ? product.qty : 0);
        const price = parseFloat(product.price) || 0;
        const name = product.name || 'Unnamed Product';
        const description = product.description || 'No description available';
        const image = product.image || product.img || 'https://via.placeholder.com/300x200?text=No+Image';
        
        return `
        <div class="product-card">
            <div class="product-image-container">
                <img src="${image}" alt="${name}" class="product-image" onerror="this.src='https://via.placeholder.com/300x200?text=No+Image'">
                ${qty <= 0 ? '<span class="out-of-stock-badge">Out of Stock</span>' : ''}
                ${qty > 0 && qty < 5 ? '<span class="low-stock-badge">Only ' + qty + ' Left!</span>' : ''}
            </div>
            <div class="product-info">
                <div class="product-category">${product.category || 'Uncategorized'}</div>
                <h3 class="product-name">${name}</h3>
                <p class="product-description">${description}</p>
                <div class="product-footer">
                    <div class="product-price">₹${price.toFixed(2)}</div>
                    <div class="product-quantity ${qty <= 0 ? 'out-stock' : qty < 5 ? 'low-stock' : ''}">
                        ${qty > 0 ? `In Stock: ${qty}` : 'Out of Stock'}
                    </div>
                </div>
                <div class="product-actions">
                    <button class="btn-icon" onclick="toggleWishlist('${product.id}')" title="Add to Wishlist">
                        <i class="fas fa-heart ${wishlist[product.id] ? 'active' : ''}"></i>
                    </button>
                    <button class="btn-view" onclick="viewProduct('${product.id}')">
                        <i class="fas fa-eye"></i> View
                    </button>
                    <button class="btn-add-cart" onclick="addToCart('${product.id}')" ${qty <= 0 ? 'disabled' : ''}>
                        <i class="fas fa-cart-plus"></i> Add to Cart
                    </button>
                </div>
            </div>
        </div>
    `}).join('');
}

// View product details
function viewProduct(productId) {
    const product = products.find(p => p.id === productId);
    if (!product) return;
    
    // Handle both field name formats
    const qty = product.quantity !== undefined ? product.quantity : (product.qty !== undefined ? product.qty : 0);
    const price = parseFloat(product.price) || 0;
    const name = product.name || 'Unnamed Product';
    const description = product.description || 'No description available';
    const image = product.image || product.img || 'https://via.placeholder.com/500x400?text=No+Image';
    const category = product.category || 'Uncategorized';
    
    const detailDiv = document.getElementById('product-detail');
    detailDiv.innerHTML = `
        <div class="product-detail-content">
            <div class="product-detail-image">
                <img src="${image}" alt="${name}" onerror="this.src='https://via.placeholder.com/500x400?text=No+Image'">
            </div>
            <div class="product-detail-info">
                <div class="product-category">${category}</div>
                <h2>${name}</h2>
                <div class="product-price-large">₹${price.toFixed(2)}</div>
                <p class="product-description-full">${description}</p>
                <div class="stock-info">
                    <strong>Availability:</strong> 
                    ${qty > 0 ? `<span class="in-stock">${qty} units in stock</span>` : '<span class="out-of-stock">Out of stock</span>'}
                </div>
                <div class="detail-actions">
                    <button class="btn-primary" onclick="addToCart('${product.id}')" ${qty <= 0 ? 'disabled' : ''}>
                        <i class="fas fa-cart-plus"></i> Add to Cart
                    </button>
                    <button class="btn-secondary" onclick="toggleWishlist('${product.id}')">
                        <i class="fas fa-heart ${wishlist[product.id] ? 'active' : ''}"></i> 
                        ${wishlist[product.id] ? 'Remove from Wishlist' : 'Add to Wishlist'}
                    </button>
                </div>
            </div>
        </div>
    `;
    
    document.getElementById('product-modal').classList.remove('hidden');
}

// Load cart
function loadCart() {
    if (!currentUser) return;
    
    database.ref(`cart/${currentUser.uid}`).on('value', (snapshot) => {
        cart = snapshot.val() || {};
        updateCartCount();
    });
}

// Add to cart
function addToCart(productId) {
    if (!currentUser) return;
    
    const product = products.find(p => p.id === productId);
    if (!product) {
        showMessage('Product not found', 'error');
        return;
    }
    
    // Check product quantity - handle both 'quantity' and 'qty' fields
    const productQty = product.quantity !== undefined ? product.quantity : (product.qty !== undefined ? product.qty : 0);
    
    if (productQty <= 0) {
        showMessage('Product is out of stock', 'error');
        return;
    }
    
    const currentQty = cart[productId] || 0;
    
    if (currentQty >= productQty) {
        showMessage('Cannot add more than available stock', 'error');
        return;
    }
    
    database.ref(`cart/${currentUser.uid}/${productId}`).set(currentQty + 1);
    showMessage('Added to cart!', 'success');
}

// Display cart
function displayCart() {
    const cartItemsDiv = document.getElementById('cart-items');
    const cartTotalSpan = document.getElementById('cart-total');
    
    if (Object.keys(cart).length === 0) {
        cartItemsDiv.innerHTML = '<div class="empty-state"><i class="fas fa-shopping-cart"></i><p>Your cart is empty</p></div>';
        cartTotalSpan.textContent = '0.00';
        return;
    }
    
    let total = 0;
    let itemsHtml = '';
    
    // Clear previous content
    cartItemsDiv.innerHTML = '<div class="loading-container"><div class="loading-spinner"></div></div>';
    
    Object.keys(cart).forEach(productId => {
        const product = products.find(p => p.id === productId);
        if (product) {
            const cartQty = cart[productId] || 0;
            // Handle both 'quantity' and 'qty' field names
            const availableQty = product.quantity !== undefined ? product.quantity : (product.qty !== undefined ? product.qty : 0);
            const qty = Math.min(cartQty, availableQty);
            const price = parseFloat(product.price) || 0;
            const name = product.name || 'Unnamed Product';
            const image = product.image || product.img || 'https://via.placeholder.com/80x80?text=No+Image';
            const itemTotal = price * qty;
            
            // Only add to total if we have valid numbers
            if (!isNaN(itemTotal)) {
                total += itemTotal;
            }
            
            itemsHtml += `
                <div class="cart-item">
                    <img src="${image}" alt="${name}" onerror="this.src='https://via.placeholder.com/80x80?text=No+Image'">
                    <div class="cart-item-info">
                        <h4>${name}</h4>
                        <p class="cart-item-price">₹${price.toFixed(2)} each</p>
                        <p class="stock-info-cart">Available stock: <strong>${availableQty}</strong></p>
                        ${cartQty > availableQty ? `<p class="warning">⚠️ Only ${availableQty} available</p>` : ''}
                    </div>
                    <div class="cart-item-controls">
                        <div class="quantity-controls">
                            <button onclick="updateCartQty('${productId}', -1)">-</button>
                            <span id="cart-qty-${productId}">${qty}</span>
                            <button onclick="updateCartQty('${productId}', 1)" ${qty >= availableQty ? 'disabled' : ''}>+</button>
                        </div>
                        <div class="cart-item-total" id="cart-item-total-${productId}">₹${itemTotal.toFixed(2)}</div>
                        <button class="btn-remove" onclick="removeFromCart('${productId}')">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
            `;
        }
    });
    
    // Update display
    cartItemsDiv.innerHTML = itemsHtml || '<div class="empty-state"><i class="fas fa-shopping-cart"></i><p>Your cart is empty</p></div>';
    cartTotalSpan.textContent = total.toFixed(2);
}

// Update cart quantity
function updateCartQty(productId, change) {
    if (!currentUser) return;
    
    const product = products.find(p => p.id === productId);
    if (!product) return;
    
    const currentQty = cart[productId] || 0;
    const newQty = currentQty + change;
    // Handle both 'quantity' and 'qty' field names
    const availableQty = product.quantity !== undefined ? product.quantity : (product.qty !== undefined ? product.qty : 0);
    
    if (newQty <= 0) {
        removeFromCart(productId);
        return;
    }
    
    if (newQty > availableQty) {
        showMessage(`Only ${availableQty} available in stock`, 'error');
        return;
    }
    
    // Update in Firebase
    database.ref(`cart/${currentUser.uid}/${productId}`).set(newQty).then(() => {
        // Update UI immediately
        const qtySpan = document.getElementById(`cart-qty-${productId}`);
        const itemTotalDiv = document.getElementById(`cart-item-total-${productId}`);
        const cartTotalSpan = document.getElementById('cart-total');
        
        if (qtySpan) {
            qtySpan.textContent = newQty;
        }
        
        // Update item total
        if (itemTotalDiv) {
            const price = parseFloat(product.price) || 0;
            const itemTotal = price * newQty;
            itemTotalDiv.textContent = `₹${itemTotal.toFixed(2)}`;
        }
        
        // Recalculate and update cart total
        let total = 0;
        Object.keys(cart).forEach(id => {
            const prod = products.find(p => p.id === id);
            if (prod) {
                const qty = id === productId ? newQty : cart[id];
                const price = parseFloat(prod.price) || 0;
                total += price * qty;
            }
        });
        
        if (cartTotalSpan) {
            cartTotalSpan.textContent = total.toFixed(2);
        }
        
        // Update button states
        const increaseBtn = document.querySelector(`button[onclick*="updateCartQty('${productId}', 1)"]`);
        if (increaseBtn) {
            increaseBtn.disabled = newQty >= availableQty;
        }
    });
}

// Remove from cart
function removeFromCart(productId) {
    if (!currentUser) return;
    database.ref(`cart/${currentUser.uid}/${productId}`).remove();
    showMessage('Removed from cart', 'success');
}

// Update cart count
function updateCartCount() {
    const count = Object.values(cart).reduce((sum, qty) => sum + qty, 0);
    document.getElementById('cart-count').textContent = count;
}

// Load wishlist
function loadWishlist() {
    if (!currentUser) return;
    
    database.ref(`wishlist/${currentUser.uid}`).on('value', (snapshot) => {
        wishlist = snapshot.val() || {};
        updateWishlistCount();
    });
}

// Toggle wishlist
function toggleWishlist(productId) {
    if (!currentUser) return;
    
    if (wishlist[productId]) {
        database.ref(`wishlist/${currentUser.uid}/${productId}`).remove();
        showMessage('Removed from wishlist', 'success');
    } else {
        database.ref(`wishlist/${currentUser.uid}/${productId}`).set(true);
        showMessage('Added to wishlist!', 'success');
    }
}

// Display wishlist
function displayWishlist() {
    const wishlistItemsDiv = document.getElementById('wishlist-items');
    
    const wishlistIds = Object.keys(wishlist);
    
    if (wishlistIds.length === 0) {
        wishlistItemsDiv.innerHTML = '<div class="empty-state"><i class="fas fa-heart"></i><p>Your wishlist is empty</p></div>';
        return;
    }
    
    const items = wishlistIds.map(productId => {
        const product = products.find(p => p.id === productId);
        if (!product) return '';
        
        // Handle both field name formats
        const qty = product.quantity !== undefined ? product.quantity : (product.qty !== undefined ? product.qty : 0);
        const price = parseFloat(product.price) || 0;
        const name = product.name || 'Unnamed Product';
        const image = product.image || product.img || 'https://via.placeholder.com/80x80?text=No+Image';
        
        return `
            <div class="wishlist-item">
                <img src="${image}" alt="${name}" onerror="this.src='https://via.placeholder.com/80x80?text=No+Image'">
                <div class="wishlist-item-info">
                    <h4>${name}</h4>
                    <p class="wishlist-item-price">₹${price.toFixed(2)}</p>
                    <p class="wishlist-item-stock ${qty <= 0 ? 'out-of-stock' : qty < 5 ? 'low-stock' : ''}">
                        ${qty > 0 ? `Stock: ${qty}` : 'Out of Stock'}
                    </p>
                </div>
                <div class="wishlist-item-actions">
                    <button class="btn-primary btn-sm" onclick="addToCart('${productId}')" ${qty <= 0 ? 'disabled' : ''}>
                        <i class="fas fa-cart-plus"></i>
                    </button>
                    <button class="btn-remove" onclick="toggleWishlist('${productId}')">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
        `;
    }).join('');
    
    wishlistItemsDiv.innerHTML = items;
}

// Update wishlist count
function updateWishlistCount() {
    document.getElementById('wishlist-count').textContent = Object.keys(wishlist).length;
}

// Checkout
async function checkout() {
    if (!currentUser || Object.keys(cart).length === 0) {
        showMessage('Your cart is empty', 'error');
        return;
    }
    
    try {
        const updates = {};
        let totalAmount = 0;
        let successfulItems = [];
        let failedItems = [];
        
        // First, validate all items
        for (const productId in cart) {
            const product = products.find(p => p.id === productId);
            if (!product) {
                failedItems.push({ name: 'Unknown Product', reason: 'Product not found' });
                continue;
            }
            
            const cartQty = cart[productId];
            const availableQty = product.quantity !== undefined ? product.quantity : (product.qty !== undefined ? product.qty : 0);
            const price = parseFloat(product.price) || 0;
            const name = product.name || 'Unnamed Product';
            
            if (availableQty >= cartQty) {
                // Sufficient stock
                updates[`products/${productId}/quantity`] = availableQty - cartQty;
                totalAmount += price * cartQty;
                successfulItems.push({ name, qty: cartQty, price: price * cartQty });
            } else if (availableQty > 0) {
                // Partial stock available
                updates[`products/${productId}/quantity`] = 0;
                totalAmount += price * availableQty;
                successfulItems.push({ name, qty: availableQty, price: price * availableQty });
                failedItems.push({ name, requestedQty: cartQty, availableQty });
            } else {
                // No stock
                failedItems.push({ name, reason: 'Out of stock' });
            }
        }
        
        if (successfulItems.length === 0) {
            showMessage('No items could be purchased. Please check stock availability.', 'error');
            return;
        }
        
        // Process the order
        await database.ref().update(updates);
        
        // Clear purchased items from cart
        for (const productId in cart) {
            const product = products.find(p => p.id === productId);
            if (product) {
                const availableQty = product.quantity !== undefined ? product.quantity : (product.qty !== undefined ? product.qty : 0);
                const cartQty = cart[productId];
                
                if (availableQty >= cartQty || availableQty > 0) {
                    await database.ref(`cart/${currentUser.uid}/${productId}`).remove();
                } else if (availableQty === 0) {
                    // Keep in cart but user will see out of stock
                    await database.ref(`cart/${currentUser.uid}/${productId}`).set(0);
                }
            }
        }
        
        // Build success message
        let message = `Order placed successfully!\n\nPurchased Items:\n`;
        successfulItems.forEach(item => {
            message += `- ${item.name} x${item.qty} = ₹${item.price.toFixed(2)}\n`;
        });
        message += `\nTotal: ₹${totalAmount.toFixed(2)}`;
        
        if (failedItems.length > 0) {
            message += `\n\nUnable to purchase:\n`;
            failedItems.forEach(item => {
                if (item.reason) {
                    message += `- ${item.name}: ${item.reason}\n`;
                } else {
                    message += `- ${item.name}: Only ${item.availableQty} available (requested ${item.requestedQty})\n`;
                }
            });
        }
        
        alert(message);
        document.getElementById('cart-modal').classList.add('hidden');
        
    } catch (error) {
        console.error('Checkout error:', error);
        showMessage('Error processing order. Please try again.', 'error');
    }
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