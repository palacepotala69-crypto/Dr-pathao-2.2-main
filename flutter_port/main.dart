import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'home_screen.dart';
import 'consult_screen.dart';
import 'pharmacy_screen.dart';

void main() {
  runApp(const DrPathaoApp());
}

class DrPathaoApp extends StatelessWidget {
  const DrPathaoApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'DR.Pathao',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        colorScheme: ColorScheme.fromSeed(
          seedColor: const Color(0xFF2563EB), // blue-600
          primary: const Color(0xFF2563EB),
          secondary: const Color(0xFFE11D48), // rose-600
        ),
        textTheme: GoogleFonts.interTextTheme(),
        useMaterial3: true,
      ),
      home: const MainLayout(),
    );
  }
}

class MainLayout extends StatefulWidget {
  const MainLayout({super.key});

  @override
  State<MainLayout> createState() => _MainLayoutState();
}

class _MainLayoutState extends State<MainLayout> {
  int _selectedIndex = 0;

  static const List<Widget> _screens = [
    HomeScreen(),
    ConsultScreen(),
    PharmacyScreen(),
    Center(child: Text('Records & Lab Results')),
    Center(child: Text('User Profile')),
  ];

  void _onItemTapped(int index) {
    setState(() {
      _selectedIndex = index;
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC), // slate-50
      body: _screens[_selectedIndex],
      bottomNavigationBar: Container(
        decoration: BoxDecoration(
          boxShadow: [
            BoxShadow(
              color: Colors.black.withOpacity(0.05),
              blurRadius: 10,
              offset: const Offset(0, -5),
            ),
          ],
        ),
        child: BottomNavigationBar(
          currentIndex: _selectedIndex,
          onTap: _onItemTapped,
          type: BottomNavigationBarType.fixed,
          selectedItemColor: const Color(0xFF2563EB),
          unselectedItemColor: const Color(0xFF94A3B8),
          selectedLabelStyle: const TextStyle(fontWeight: FontWeight.bold, fontSize: 10),
          unselectedLabelStyle: const TextStyle(fontWeight: FontWeight.bold, fontSize: 10),
          items: const [
            BottomNavigationBarItem(icon: Icon(Icons.home_filled), label: 'HOME'),
            BottomNavigationBarItem(icon: Icon(Icons.medical_services_outlined), label: 'CONSULT'),
            BottomNavigationBarItem(icon: Icon(Icons.local_pharmacy_outlined), label: 'PHARMACY'),
            BottomNavigationBarItem(icon: Icon(Icons.file_copy_outlined), label: 'RECORDS'),
            BottomNavigationBarItem(icon: Icon(Icons.person_outline), label: 'PROFILE'),
          ],
        ),
      ),
    );
  }
}
