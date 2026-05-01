import 'package:flutter/material.dart';

class ConsultScreen extends StatefulWidget {
  const ConsultScreen({super.key});

  @override
  State<ConsultScreen> createState() => _ConsultScreenState();
}

class _ConsultScreenState extends State<ConsultScreen> {
  String _activeSpecialty = 'All';
  final List<String> _specialties = ['All', 'General', 'Dental', 'Child', 'Skin', 'Eye', 'Heart'];

  // Mock data for now, would be fetched from Firestore in a real app
  final List<Map<String, dynamic>> _doctors = [
    {
      'name': 'Dr. Binod Shrestha',
      'specialty': 'General Physician',
      'exp': '12 Yrs',
      'rating': 4.8,
      'fee': 800,
      'available': true,
      'avatar': 'https://api.dicebear.com/7.x/avataaars/svg?seed=Binod'
    },
    {
      'name': 'Dr. Sarala Thapa',
      'specialty': 'Gynecologist',
      'exp': '8 Yrs',
      'rating': 4.9,
      'fee': 1200,
      'available': true,
      'avatar': 'https://api.dicebear.com/7.x/avataaars/svg?seed=Sarala'
    },
    {
      'name': 'Dr. Ramesh Karki',
      'specialty': 'Cardiologist',
      'exp': '15 Yrs',
      'rating': 4.7,
      'fee': 1500,
      'available': true,
      'avatar': 'https://api.dicebear.com/7.x/avataaars/svg?seed=Ramesh'
    },
  ];

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC),
      appBar: AppBar(
        title: const Text('Consult Doctor', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 18)),
        backgroundColor: Colors.white,
        elevation: 0,
        surfaceTintColor: Colors.transparent,
      ),
      body: Column(
        children: [
          _buildSearchAndFilter(),
          _buildSpecialtyTabs(),
          Expanded(child: _buildDoctorsList()),
        ],
      ),
    );
  }

  Widget _buildSearchAndFilter() {
    return Container(
      padding: const EdgeInsets.all(20),
      color: Colors.white,
      child: TextField(
        decoration: InputDecoration(
          hintText: 'Search doctors or specialties...',
          hintStyle: const TextStyle(color: Color(0xFF94A3B8), fontSize: 13),
          prefixIcon: const Icon(Icons.search, color: Color(0xFF64748B)),
          suffixIcon: const Icon(Icons.tune, color: Color(0xFF2563EB)),
          filled: true,
          fillColor: const Color(0xFFF8FAFC),
          border: OutlineInputBorder(
            borderRadius: BorderRadius.circular(20),
            borderSide: BorderSide.none,
          ),
        ),
      ),
    );
  }

  Widget _buildSpecialtyTabs() {
    return Container(
      height: 60,
      color: Colors.white,
      child: ListView.builder(
        scrollDirection: Axis.horizontal,
        padding: const EdgeInsets.symmetric(horizontal: 16),
        itemCount: _specialties.length,
        itemBuilder: (context, index) {
          final isSelected = _activeSpecialty == _specialties[index];
          return Padding(
            padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 10),
            child: ChoiceChip(
              label: Text(_specialties[index]),
              selected: isSelected,
              onSelected: (selected) {
                setState(() => _activeSpecialty = _specialties[index]);
              },
              selectedColor: const Color(0xFF2563EB),
              backgroundColor: Colors.white,
              labelStyle: TextStyle(
                color: isSelected ? Colors.white : const Color(0xFF64748B),
                fontSize: 12,
                fontWeight: FontWeight.bold,
              ),
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
              side: BorderSide(color: isSelected ? const Color(0xFF2563EB) : const Color(0xFFE2E8F0)),
              showCheckmark: false,
            ),
          );
        },
      ),
    );
  }

  Widget _buildDoctorsList() {
    return ListView.builder(
      padding: const EdgeInsets.all(20),
      itemCount: _doctors.length,
      itemBuilder: (context, index) {
        final doctor = _doctors[index];
        return Container(
          margin: const EdgeInsets.only(bottom: 16),
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(28),
            border: Border.all(color: const Color(0xFFF1F5F9)),
            boxShadow: [
              BoxShadow(color: Colors.black.withOpacity(0.02), blurRadius: 4, offset: const Offset(0, 2)),
            ],
          ),
          child: Column(
            children: [
              Row(
                children: [
                  Container(
                    width: 60,
                    height: 60,
                    decoration: BoxDecoration(
                      color: const Color(0xFFEFF6FF),
                      borderRadius: BorderRadius.circular(16),
                    ),
                    child: ClipRRect(
                      borderRadius: BorderRadius.circular(16),
                      child: Image.network(doctor['avatar']),
                    ),
                  ),
                  const SizedBox(width: 16),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Text(doctor['name'], style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                              decoration: BoxDecoration(
                                color: const Color(0xFFFEF3C7),
                                borderRadius: BorderRadius.circular(20),
                              ),
                              child: Row(
                                children: [
                                  const Icon(Icons.star, color: Color(0xFFD97706), size: 10),
                                  const SizedBox(width: 2),
                                  Text(doctor['rating'].toString(), style: const TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: Color(0xFFD97706))),
                                ],
                              ),
                            ),
                          ],
                        ),
                        Text(doctor['specialty'], style: const TextStyle(color: Color(0xFF2563EB), fontSize: 12, fontWeight: FontWeight.bold)),
                        const SizedBox(height: 4),
                        Row(
                          children: [
                            const Icon(Icons.access_time, color: Color(0xFF94A3B8), size: 12),
                            const SizedBox(width: 4),
                            Text(doctor['exp'], style: const TextStyle(color: Color(0xFF94A3B8), fontSize: 10, fontWeight: FontWeight.bold)),
                          ],
                        ),
                      ],
                    ),
                  ),
                ],
              ),
              const Divider(height: 24, color: Color(0xFFF1F5F9)),
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text('Rs. ${doctor['fee']}', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16, color: Color(0xFF0F172A))),
                  ElevatedButton(
                    onPressed: () {},
                    style: ElevatedButton.styleFrom(
                      backgroundColor: const Color(0xFF2563EB),
                      foregroundColor: Colors.white,
                      elevation: 0,
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                      padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
                    ),
                    child: const Text('Book Now', style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold)),
                  ),
                ],
              ),
            ],
          ),
        );
      },
    );
  }
}
