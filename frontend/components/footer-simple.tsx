import Link from 'next/link';

const footerLinks = {
  Product: [
    { title: 'Features', href: '/features' },
    { title: 'Pricing', href: '/pricing' },
    { title: 'Demo', href: '/demo' },
  ],
  Company: [
    { title: 'About', href: '/about' },
    { title: 'Blog', href: '/blog' },
    { title: 'Careers', href: '/careers' },
  ],
  Support: [
    { title: 'Help', href: '/help' },
    { title: 'Contact', href: '/contact' },
    { title: 'Status', href: '/status' },
  ],
  Legal: [
    { title: 'Privacy', href: '/privacy' },
    { title: 'Terms', href: '/terms' },
    { title: 'Security', href: '/security' },
  ],
};

export function FooterSimple() {
  return (
    <footer className="border-t bg-background/95">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-5">
          {/* Brand */}
          <div className="lg:col-span-2">
            <h3 className="text-lg font-semibold text-foreground">Resumemo</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              AI-powered resume ranking for smarter hiring decisions.
            </p>
          </div>

          {/* Links */}
          {Object.entries(footerLinks).map(([category, links]) => (
            <div key={category}>
              <h4 className="text-sm font-semibold text-foreground">{category}</h4>
              <ul className="mt-3 space-y-2">
                {links.map((link) => (
                  <li key={link.title}>
                    <Link
                      href={link.href}
                      className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                    >
                      {link.title}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom Bar */}
        <div className="mt-8 border-t pt-8">
          <p className="text-center text-sm text-muted-foreground">
            © 2025 Resumemo. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
