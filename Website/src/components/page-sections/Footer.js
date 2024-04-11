const navigation = {
    main: [
      { name: 'Product', href: '/' },
    ],
  }
  
  export default function Footer() {
    return (
      <footer className="bg-white text-center">
        <div className="mx-auto max-w-7xl overflow-hidden px-6 py-10 sm:py-12 lg:px-8">
          <nav className="-mb-12 sm:space-x-12" aria-label="Footer">
            {navigation.main.map((item) => (
              <div key={item.name} className="pb-6">
                <a href={item.href} className="text-sm leading-6 text-gray-600 hover:text-gray-900">
                  {item.name}
                </a>
              </div>
            ))}
          </nav>
          <p className="mt-10 text-center text-xs leading-5 text-gray-500">
            &copy; 2024 Expense Tracker, Inc. All rights reserved.
          </p>
        </div>
      </footer>
    )
  }
  