"use client";

import "./bot.css";
import { useState, useEffect } from "react";
import { useAuth } from "../../hooks/useAuth";
import { completeProfile } from "../../utils/api";
import AuthModal from "../../components/AuthModal";
import ProfileModal from "../../components/ProfileModal";
import { useCart } from "../../hooks/useCart";
import { useChat } from "../../hooks/useChat";
import ChatContainer from "../../components/chat/ChatContainer";
import ChatInput from "../../components/chat/ChatInput";
import CartSummary from "../../components/CartSummary";
import ItemDetailsModal from "../../components/ItemDetailsModal";

export default function FoodBot() {
  const { cart, addToCart, removeFromCart, updateQuantity, clearCart, getTotalItems, getTotalPrice, getTotalTax, getTaxBreakdown, setTaxInfo } = useCart();
  const { messages, isLoading, sendMessage, addAssistantMessage, messagesEndRef } = useChat();
  const { isLoggedIn, login, verifyOtp, logout } = useAuth();
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authStep, setAuthStep] = useState('phone');
  const [authPhone, setAuthPhone] = useState('');
  const [authOtp, setAuthOtp] = useState('');
  const [authLoading, setAuthLoading] = useState(false);
  const [authMessage, setAuthMessage] = useState('');
  // Profile modal state
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [profileFirstName, setProfileFirstName] = useState('');
  const [profileLastName, setProfileLastName] = useState('');
  const [profileEmail, setProfileEmail] = useState('');
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileMessage, setProfileMessage] = useState('');
  const [showCart, setShowCart] = useState(false);
  const [cartGlow, setCartGlow] = useState(false);
  const [cartButtonRef, setCartButtonRef] = useState(null);
  const [floatingItem, setFloatingItem] = useState(null);
  const [selectedItemForModal, setSelectedItemForModal] = useState(null);
  const [taxInfoMap, setTaxInfoMapLocal] = useState({});

  // Update tax info when menu data arrives
  useEffect(() => {
    const lastMessage = messages[messages.length - 1];
   if (lastMessage?.menuData?.category_data) {
      setTaxInfo(lastMessage.menuData.category_data[0]);
      // Also store tax info locally for modal preview
      const newTaxInfoMap = {};
      lastMessage.menuData.category_data.forEach((category) => {
        setTaxInfo(category);
        category.sub_category_data?.forEach((subCategory) => {
          const categoryId = subCategory.menu_id;
          newTaxInfoMap[categoryId] = {
            tax_class: subCategory.tax_class,
            map_tax_class: subCategory.map_tax_class,
          };
        });
      });
      setTaxInfoMapLocal(prev => ({ ...prev, ...newTaxInfoMap }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages.length]);

  const handleSendMessage = (text) => {
    // If currently on cart page, switch to chat
    if (showCart) {
      setShowCart(false);

      // small delay to allow UI transition
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
      }, 100);
    }

    // Send message normally
    sendMessage(text);
  };

  // Handle ESC key to go back to chat
  useEffect(() => {
    const handleKeyPress = (event) => {
      if (event.key === 'Escape' && showCart) {
        setShowCart(false);
        setTimeout(() => {
          messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
        }, 100);
      }
    };

    document.addEventListener('keydown', handleKeyPress);
    return () => document.removeEventListener('keydown', handleKeyPress);
  }, [showCart, messagesEndRef]);

  // Handle page reload/leave warning
  useEffect(() => {
    const handleBeforeUnload = (event) => {
      if (cart.length > 0 || messages.length > 1) { // messages.length > 1 to exclude the welcome message
        event.preventDefault();
        event.returnValue = 'You will lose your conversation and items in cart. Are you sure you want to leave?';
        return 'You will lose your conversation and items in cart. Are you sure you want to leave?';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [cart.length, messages.length]);

  const handleCategoryClick = (categoryName) => {
    const userText = `Show me ${categoryName}`;
    sendMessage(userText);
  };

  const handleItemClick = (item) => {
    // Open item details modal instead of adding to chat
    setSelectedItemForModal(item);
  };

  const handleCloseModal = () => {
    setSelectedItemForModal(null);
  };

  const handleAddToCart = async (orderItem, buttonRect) => {
    await addToCart(orderItem);

    // Trigger cart glow effect
    setCartGlow(true);
    setTimeout(() => setCartGlow(false), 1000);

    // Trigger floating animation if button position and cart button are available
    if (buttonRect && cartButtonRef) {
      const cartRect = cartButtonRef.getBoundingClientRect();
      const startX = buttonRect.left + buttonRect.width / 2;
      const startY = buttonRect.top + buttonRect.height / 2;
      const endX = cartRect.left + cartRect.width / 2;
      const endY = cartRect.top + cartRect.height / 2;

      setFloatingItem({
        id: Date.now(),
        startX,
        startY,
        endX,
        endY,
        item: orderItem
      });

      // Remove floating item after animation
      setTimeout(() => setFloatingItem(null), 800);
    }

  };

  return (
    <div className="food-bot-container">
      {/* Header */}
      <header className="food-bot-header">
        <div className="header-logo">
          <span>🤖</span>
        </div>
        <div className="header-info">
          <h1>{showCart ? 'Your Cart' : 'AI Food Bot'}</h1>
          <p>{showCart ? 'Review your order' : 'Chat to customize & order'}</p>
        </div>
        <div className="header-cart">
          {showCart ? (
            <button
              onClick={() => {
                setShowCart(false);
                // Scroll to bottom after state update
                setTimeout(() => {
                  messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
                }, 100);
              }}
              className="back-button"
            >
              Go Back
            </button>
          ) : (
            <button
              ref={setCartButtonRef}
              onClick={() => setShowCart(!showCart)}
              className={`cart-button ${cartGlow ? 'cart-glow' : ''}`}
            >
              🛒 Cart {getTotalItems() > 0 && `(${getTotalItems()})`}
            </button>
          )}

          

        {showProfileModal && 
              <ProfileModal
                isOpen={showProfileModal}
                firstName={profileFirstName}
                setFirstName={setProfileFirstName}
                lastName={profileLastName}
                setLastName={setProfileLastName}
                email={profileEmail}
                setEmail={setProfileEmail}
                loading={profileLoading}
                message={profileMessage}
                onSubmit={async () => {
                if (!profileFirstName.trim() || !profileLastName.trim()) {
                  setProfileMessage("First and Last name are required");
                  return;
                }

                try {
                  setProfileLoading(true);
                  setProfileMessage('');

                  const res = await completeProfile({
                    phone_number: authPhone,
                    first_name: profileFirstName,
                    last_name: profileLastName,
                    email: profileEmail,
                  });

                  if (res && res.success) {
                    setProfileMessage('Profile completed!');

                    setTimeout(() => {
                      setShowProfileModal(false);
                    }, 800);
                  } else {
                    setProfileMessage(res?.message || 'Profile update failed');
                  }
                } catch (err) {
                  console.error(err);
                  setProfileMessage('Network error');
                } finally {
                  setProfileLoading(false);
                }
              }}

              />
          }
          {/* Auth Button */}
          {!isLoggedIn ? (
            <>
              <button
                onClick={() => {
                  setAuthPhone('');
                  setAuthOtp('');
                  setAuthMessage('');
                  setAuthStep('phone');
                  setShowAuthModal(true);
                }}
                className="login-button"
              >
                Login
              </button>
              <AuthModal
                isOpen={showAuthModal}
                step={authStep}
                phone={authPhone}
                setPhone={setAuthPhone}
                otp={authOtp}
                setOtp={setAuthOtp}
                loading={authLoading}
                message={authMessage}
                onClose={() => setShowAuthModal(false)}
                onSendPhone={async () => {
                  try {
                    setAuthLoading(true);
                    setAuthMessage('');
                    const res = await login({ phone_number: authPhone, phone_code: '+91' });
                    if (res && res.success) {
                      setAuthMessage(res.message || 'OTP sent');
                      setAuthStep('otp');
                    } else {
                      setAuthMessage(res?.message || 'Failed to send OTP');
                    }
                  } catch (err) {
                    console.error(err);
                    setAuthMessage('Network error');
                  } finally {
                    setAuthLoading(false);
                  }
                }}
                onVerifyOtp={async () => {
                  try {
                    setAuthLoading(true);
                    setAuthMessage('');

                    const res = await verifyOtp({
                      otp: authOtp,
                      phone_number: authPhone,
                    });
                    // console.log("_res",res)

                    if (res && res.success) {
                      // If user is new → force profile modal
                      if (res.is_already !=1) {
                        // Close auth modal first
                        setShowAuthModal(false);

                        // Small delay ensures proper render order
                        // setTimeout(() => {
                          setProfileFirstName('');
                          setProfileLastName('');
                          setProfileEmail('');
                          setProfileMessage('');
                          setShowProfileModal(true);
                        // }, 100);
                      } else {
                        setAuthMessage('Logged in successfully');
                        setTimeout(() => {
                          setShowAuthModal(false);
                        }, 800);
                      }
                    } else {
                      setAuthMessage(res?.message || 'OTP verification failed');
                    }
                  } catch (err) {
                    console.error(err);
                    setAuthMessage('Network error');
                  } finally {
                    setAuthLoading(false);
                  }
                }}

              />

            </>
          ) : (
            <button onClick={() => logout()} className="logout-button">Logout</button>
          )}
        </div>
      </header>

      {/* Main Chat Area */}
      <main className="food-bot-main">
        <div className={`view-container ${showCart ? 'cart-active' : 'chat-active'}`}>
          {showCart ? (
            <div className="cart-view flex items-center justify-center min-h-full p-4">
              <CartSummary
                cart={cart}
                onRemoveItem={removeFromCart}
                onUpdateQuantity={updateQuantity}
                onClose={() => {
                  setShowCart(false);
                  setTimeout(() => {
                    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
                  }, 100);
                }}
                onEmptyCart={clearCart}
                getTotalTax={getTotalTax}
                getTaxBreakdown={getTaxBreakdown}
                isLoggedIn={isLoggedIn}
                onRequireLogin={() => {
                  setShowCart(false);
                  setAuthStep("phone");
                  setShowAuthModal(true);
                }}
                onProceedCheckout={() => {
                  const totalQuantity = cart.reduce((sum, item) => sum + item.quantity, 0);
                  const totalTax = getTotalTax ? getTotalTax() : 0;
                  const subtotal = cart.reduce((sum, item) => (sum + item.total_price)-totalTax, 0);
                  const totalPrice = cart.reduce((sum, item) => sum + item.total_price, 0);
                  const userData = JSON.parse(localStorage.getItem("user_data") || "{}");
                  
                  const payload = {
                    first_name: userData.first_name || "",
                    last_name: userData.last_name || "",
                    name: `${userData.first_name || ""} ${userData.last_name || ""}`.trim(),
                    email: userData.email || "",
                    phone: userData.phone || "",
                    iso_code: "GB",
                    phone_code: "+91",
                    ip_address: "0.0.0.0",
                    stripe_id: "",
                    commission: 0,
                    discountAmount: 0,
                    currency: "SAR",

                    final_price: subtotal,
                    remaning_amount: 0,
                    sub_total: subtotal,
                    platform_fee: 0,
                    total_price: totalPrice,
                    total_tax: totalTax,
                    payment_option: "upi",
                    is_saved_card: false,
                    service_charge: 0,
                    upi_method: "upi",

                    delivery_address: "",
                    round_off: 0,
                    id: "",
                    address_lat: "",
                    address_long: "",
                    complete_address: "",
                    delivery_charges: null,
                    house_no: "",
                    near_land_mark: "",
                    street_name: "",
                    zip_code: "",

                    store_status: 3,
                    store_type: 3,
                    device_type: "web",
                    order_category: 1,
                    is_asap: 2,
                    order_comments: "",
                    order_note: "",
                    pre_order_status: 0,

                    quantity: totalQuantity,
                    items: cart,

                    selectedDate: new Date().toLocaleDateString(),
                    time: new Date().toLocaleTimeString(),
                  };
                  console.log("cart",cart);
                  console.log("CHECKOUT PAYLOAD:", payload);
                }}

              />
            </div>
          ) : (
            <ChatContainer
              messages={messages}
              isLoading={isLoading}
              onCategoryClick={handleCategoryClick}
              onItemClick={handleItemClick}
              onAddToCart={handleAddToCart}
              messagesEndRef={messagesEndRef}
            />
          )}
        </div>
      </main>

      {/* Bottom Input */}
      <ChatInput onSend={handleSendMessage} disabled={isLoading} />

      {/* Floating Item Animation */}
      {floatingItem && (
        <div
          key={floatingItem.id}
          className="floating-item"
          style={{
            '--start-x': `${floatingItem.startX}px`,
            '--start-y': `${floatingItem.startY}px`,
            '--end-x': `${floatingItem.endX}px`,
            '--end-y': `${floatingItem.endY}px`,
          }}
        >
          <img
            src={floatingItem.item.image || "/images/no_preview.png"}
            alt={floatingItem.item.name}
            className="w-8 h-8 rounded-full object-cover"
          />
        </div>
      )}

      {/* Item Details Modal */}
      {selectedItemForModal && (
        <ItemDetailsModal
          item={selectedItemForModal}
          onAddToCart={handleAddToCart}
          onClose={handleCloseModal}
          taxInfoMap={taxInfoMap}
        />
      )}
    </div>
  );
}
