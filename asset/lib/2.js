class Squiggle {
    constructor(stage, settings, grid) {
        this.grid = grid;
        this.stage = stage;
        this.sqwigs = [];
        this.state = 'animating';
        
        settings.width = 0;
        settings.opacity = 1;

        let path = this.createLine(settings);
        let sqwigCount = 3;
        
        for(let i = 0; i < sqwigCount; i++) {
            this.createSqwig(i, sqwigCount, path, JSON.parse(JSON.stringify(settings)), i == sqwigCount - 1);
        }
    }

    createSqwig(index, total, path, settings, forceWhite) {
        let sqwig = document.createElementNS("http://www.w3.org/2000/svg", 'path');
        sqwig.setAttribute('d', path);
        sqwig.style.fill = 'none';
        sqwig.style.stroke = forceWhite ? '#303030' : this.getColor();
        sqwig.style.strokeLinecap = "round";
        
        settings.length = sqwig.getTotalLength();
        settings.chunkLength = settings.length / 6;
        settings.progress = settings.chunkLength;

        sqwig.style.strokeDasharray = `${settings.chunkLength}, ${settings.length + settings.chunkLength}`;
        sqwig.style.strokeDashoffset = `${settings.progress}`;

        this.stage.appendChild(sqwig);
        this.sqwigs.unshift({path: sqwig, settings: settings});

        gsap.to(settings, {
            duration: settings.sections * 0.1,
            progress: -settings.length,
            width: settings.sections * 0.9,
            ease: "power1.out",
            delay: index * (settings.sections * 0.01),
            onComplete: () => {
                if(index == total - 1) this.state = 'ended';
                sqwig.remove();
            }
        });
    }

    update() {
        this.sqwigs.forEach(set => {
            set.path.style.strokeDashoffset = `${set.settings.progress}`;
            set.path.style.strokeWidth = `${set.settings.width}px`;
            set.path.style.opacity = `${set.settings.opacity}`;
        });
    }

    createLine(settings) {
        let x = settings.x;
        let y = settings.y;
        let dx = settings.directionX;
        let dy = settings.directionY;
        let path = ['M', x, y, "Q"];

        let steps = settings.sections;
        let step = 0;
        
        const getNewDirection = (direction, goAnywhere) => {
            if(!goAnywhere && settings['direction' + direction.toUpperCase()] != 0) 
                return settings['direction' + direction.toUpperCase()];
            return Math.random() < 0.5 ? -1 : 1;
        }

        while(step < steps * 2) {
            step++;
            x += (dx * (step/ 30)) * this.grid;
            y += (dy * (step/ 30)) * this.grid;
            if(step != 1) path.push(',');
            path.push(x);
            path.push(y);
            
            if(step % 2 != 0) {
                dx = dx == 0 ? getNewDirection('x', step > 8) : 0;
                dy = dy == 0 ? getNewDirection('y', step > 8) : 0;
            }
        }
        
        return path.join(' ');
    }

    getColor() {
        let offset = Math.round(Math.random() * 100);
        let r = Math.sin(0.3 * offset) * 100 + 155;
        let g = Math.sin(0.3 * offset + 2) * 100 + 155;
        let b = Math.sin(0.3 * offset + 4) * 100 + 155;
        return "#" + this.componentToHex(r) + this.componentToHex(g) + this.componentToHex(b);
    }

    componentToHex(c) {
        let hex = Math.round(c).toString(16);
        return hex.length == 1 ? "0" + hex : hex;
    }
}

class App {
    constructor(container) {
        this.container = container;
        this.svg = document.getElementById('stage');
        this.squiggles = [];
        this.grid = 40;
        this.lastMousePosition = null;
        this.isDrawing = false;
        
        this.onResize();
        this.setupInput();
        this.tick();
        
        window.addEventListener('resize', () => this.onResize());
    }
    
    setupInput() {
        const getPosition = (e) => {
            const evt = e.touches ? e.touches[0] : e;
            return {
                x: evt.clientX,
                y: evt.clientY
            };
        };
        
        // 鼠标移动事件
        this.container.addEventListener('mousemove', (e) => {
            const position = getPosition(e);
            if (this.lastMousePosition) {
                for(let i = 0; i < 2; i++) {
                    this.createSqwigFromMouse(position);
                }
            }
            this.lastMousePosition = position;
        });
        
        // 鼠标离开容器时重置
        this.container.addEventListener('mouseleave', () => {
            this.lastMousePosition = null;
        });

        // 触摸事件支持
        this.container.addEventListener('touchmove', (e) => {
            e.preventDefault();
            const position = getPosition(e);
            if (this.lastMousePosition) {
                for(let i = 0; i < 2; i++) {
                    this.createSqwigFromMouse(position);
                }
            }
            this.lastMousePosition = position;
        });

        this.container.addEventListener('touchend', () => {
            this.lastMousePosition = null;
        });
    }

    createSqwigFromMouse(position) {
        if(!this.lastMousePosition) return;
        
        let sections = 4;
        let newDirection = {x: 0, y: 0};
        let xAmount = Math.abs(this.lastMousePosition.x - position.x);
        let yAmount = Math.abs(this.lastMousePosition.y - position.y);

        if(xAmount > yAmount) {
            newDirection.x = this.lastMousePosition.x - position.x < 0 ? 1 : -1;
            sections += Math.round(xAmount/4);
        } else {
            newDirection.y = this.lastMousePosition.y - position.y < 0 ? 1 : -1;
            sections += Math.round(yAmount/4);
        }
        
        let settings = {
            x: this.lastMousePosition.x,
            y: this.lastMousePosition.y,
            directionX: newDirection.x,
            directionY: newDirection.y,
            sections: Math.min(sections, 20)
        };
        
        let newSqwig = new Squiggle(this.svg, settings, 10 + Math.random() * (sections * 1.5));
        this.squiggles.push(newSqwig);
    }

    onResize() {
        this.width = this.container.offsetWidth;
        this.height = this.container.offsetHeight;
        this.svg.setAttribute('width', this.width);
        this.svg.setAttribute('height', this.height);
    }

    tick() {
        let step = this.squiggles.length - 1;
        while(step >= 0) {
            if(this.squiggles[step].state != 'ended') {
                this.squiggles[step].update();
            } else {
                this.squiggles.splice(step, 1);
            }
            --step;
        }
        requestAnimationFrame(() => this.tick());
    }
}

// body
const app = new App(document.getElementsByTagName('body')[0]);