document.addEventListener('DOMContentLoaded', () => {
    const popupContainer = document.getElementById('popup-container');

    function showPopup(button) {
        const thankPopup = document.createElement('div');
        thankPopup.className = 'thank-popup';
        thankPopup.innerHTML = `
            <div class="thank-popup-content">
                <span class="close-popup">&times;</span>
                <div class="icon-menu">
                    <img src="photo/Frame2.png" alt="Icon 1" class="thank-icon">
                    <img src="photo/Frame3.png" alt="Icon 2" class="thank-icon">
                    <img src="photo/Frame4.png" alt="Icon 3" class="thank-icon">
                    <img src="photo/Frame5.png" alt="Icon 4" class="thank-icon">
                    <img src="photo/Frame6.png" alt="Icon 5" class="thank-icon">
                    <img src="photo/Frame7.png" alt="Icon 6" class="thank-icon">
                    <img src="photo/Frame10.png" alt="Icon 7" class="thank-icon">
                    <img src="photo/Frame11.png" alt="Icon 8" class="thank-icon">
                </div>
            </div>
        `;

        const buttonRect = button.getBoundingClientRect();
        thankPopup.style.top = `${buttonRect.bottom + window.scrollY}px`;
        thankPopup.style.left = `${buttonRect.left + window.scrollX}px`;
        thankPopup.style.display = 'block';
        
        // Append the popup to the container
        popupContainer.appendChild(thankPopup);

        // Add event listener for the close button
        const closeButton = thankPopup.querySelector('.close-popup');
        closeButton.addEventListener('click', () => {
            popupContainer.removeChild(thankPopup);
        });

        // Hide the popup when clicking outside
        document.addEventListener('click', (event) => {
            if (!event.target.closest('.thank-popup') && !event.target.closest('.thank-button')) {
                if (popupContainer.contains(thankPopup)) {
                    popupContainer.removeChild(thankPopup);
                }
            }
        }, { once: true });
    }

    // Event delegation for thank buttons
    document.addEventListener('click', (event) => {
        if (event.target.classList.contains('thank-button')) {
            event.stopPropagation();
            showPopup(event.target);
        }
    });
});
