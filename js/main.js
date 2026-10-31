const CART_KEY="cart";

function getCart(){

   const text=localStorage.getItem(CART_KEY);
    if (text === null)
        return [];

    return JSON.parse(text);
}

function saveCart(cart){

    localStorage.setItem(CART_KEY,JSON.stringify(cart));
     updateCartBadge();

}
function addToCart(productId){
   const cart=getCart();
    const item=cart.find(entry => entry.id===productId);
    if(item != undefined){
        item.qty+=1;
    }
    else{
        cart.push({id:productId, qty:1});
        
    }
    saveCart(cart);
}

function updateCartBadge(){
    const total = getCart().reduce((sum, entry) => sum + entry.qty, 0);
    const badge = document.getElementById("cart-count");
    if (badge) {
        badge.textContent = total;
    }
}
updateCartBadge();

function changeQty(productId, change) {
    const cart = getCart();
    const item = cart.find(entry => entry.id === productId);

    if (item === undefined) {
        return;
    }

    item.qty += change;

    if (item.qty <= 0) {
        // quantity hit zero: drop the entry, keep the others
        saveCart(cart.filter(entry => entry.id !== productId));
    } else {
        saveCart(cart);
    }
}

function removeFromCart(productId) {
    const cart = getCart().filter(entry => entry.id !== productId);
    saveCart(cart);
}


