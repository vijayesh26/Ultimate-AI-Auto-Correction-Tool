import { Github } from "lucide-react";

const Footer = () => (
  <footer className="border-t border-border mt-20 bg-background/40">
    <div className="max-w-6xl mx-auto px-4 py-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-muted-foreground">
      <p>© {new Date().getFullYear()} SpellAI · v1.0.0</p>
      <div className="flex items-center gap-5">
        <a href="#privacy" className="hover:text-foreground transition-colors">Privacy</a>
        <a href="#terms" className="hover:text-foreground transition-colors">Terms</a>
        <a
          href="https://github.com"
          target="_blank"
          rel="noreferrer"
          className="hover:text-foreground transition-colors inline-flex items-center gap-1.5"
        >
          <Github className="h-3.5 w-3.5" /> GitHub
        </a>
      </div>
    </div>
  </footer>
);

export default Footer;
