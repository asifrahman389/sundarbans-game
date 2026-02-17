// Handle keyboard and touch input
class Input {
    constructor() {
        this.forward = false;
        this.backward = false;
        this.left = false;
        this.right = false;
        this.boost = false;
        
        this.setupKeyboard();
        this.setupTouch();
        this.setupMouse();
    }
    
    setupKeyboard() {
        window.addEventListener('keydown', (e) => {
            switch(e.key.toLowerCase()) {
                case 'w':
                case 'arrowup':
                    this.forward = true;
                    break;
                case 's':
                case 'arrowdown':
                    this.backward = true;
                    break;
                case 'a':
                case 'arrowleft':
                    this.left = true;
                    break;
                case 'd':
                case 'arrowright':
                    this.right = true;
                    break;
                case 'shift':
                    this.boost = true;
                    break;
            }
        });
        
        window.addEventListener('keyup', (e) => {
            switch(e.key.toLowerCase()) {
                case 'w':
                case 'arrowup':
                    this.forward = false;
                    break;
                case 's':
                case 'arrowdown':
                    this.backward = false;
                    break;
                case 'a':
                case 'arrowleft':
                    this.left = false;
                    break;
                case 'd':
                case 'arrowright':
                    this.right = false;
                    break;
                case 'shift':
                    this.boost = false;
                    break;
            }
        });
    }
    
    setupTouch() {
        let touchStartX = 0;
        let touchStartY = 0;
        
        window.addEventListener('touchstart', (e) => {
            touchStartX = e.touches[0].clientX;
            touchStartY = e.touches[0].clientY;
            
            // Forward on right side, back on left
            if (touchStartX > window.innerWidth / 2) {
                this.forward = true;
            } else {
                this.backward = true;
            }
        });
        
        window.addEventListener('touchmove', (e) => {
            const touchX = e.touches[0].clientX;
            const diff = touchX - touchStartX;
            
            if (diff < -30) {
                this.left = true;
                this.right = false;
            } else if (diff > 30) {
                this.right = true;
                this.left = false;
            } else {
                this.left = false;
                this.right = false;
            }
        });
        
        window.addEventListener('touchend', () => {
            this.forward = false;
            this.backward = false;
            this.left = false;
            this.right = false;
        });
    }
    
    setupMouse() {
        // Mouse look (optional)
        this.mouseX = 0;
        this.mouseY = 0;
        
        window.addEventListener('mousemove', (e) => {
            this.mouseX = (e.clientX / window.innerWidth) * 2 - 1;
            this.mouseY = -(e.clientY / window.innerHeight) * 2 + 1;
        });
    }
}
