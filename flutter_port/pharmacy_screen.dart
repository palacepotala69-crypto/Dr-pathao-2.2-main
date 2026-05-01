import 'package:flutter/material.dart';

class PharmacyScreen extends StatelessWidget {
  const PharmacyScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC),
      appBar: AppBar(
        title: const Text('Pharmacy', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 18)),
        backgroundColor: Colors.white,
        elevation: 0,
        surfaceTintColor: Colors.transparent,
      ),
      body: Column(
        children: [
          _buildSearchBar(),
          _buildCategories(),
          Expanded(child: _buildProductGrid()),
        ],
      ),
    );
  }

  Widget _buildSearchBar() {
    return Container(
      padding: const EdgeInsets.all(20),
      color: Colors.white,
      child: TextField(
        decoration: InputDecoration(
          hintText: 'Search medicines, vitamins...',
          prefixIcon: const Icon(Icons.search),
          filled: true,
          fillColor: const Color(0xFFF8FAFC),
          border: OutlineInputBorder(borderRadius: BorderRadius.circular(20), borderSide: BorderSide.none),
        ),
      ),
    );
  }

  Widget _buildCategories() {
    final List<String> categories = ['All', 'Vitamins', 'Painkillers', 'First Aid', 'Skincare'];
    return Container(
      height: 50,
      color: Colors.white,
      child: ListView.builder(
        scrollDirection: Axis.horizontal,
        padding: const EdgeInsets.symmetric(horizontal: 16),
        itemCount: categories.length,
        itemBuilder: (context, index) {
          return Padding(
            padding: const EdgeInsets.only(right: 12),
            child: FilterChip(
              label: Text(categories[index]),
              onSelected: (val) {},
              backgroundColor: const Color(0xFFF8FAFC),
              labelStyle: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold),
            ),
          );
        },
      ),
    );
  }

  Widget _buildProductGrid() {
    return GridView.builder(
      padding: const EdgeInsets.all(20),
      gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
        crossAxisCount: 2,
        childAspectRatio: 0.7,
        crossAxisSpacing: 16,
        mainAxisSpacing: 16,
      ),
      itemCount: 4,
      itemBuilder: (context, index) {
        return Container(
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(24),
            border: Border.all(color: const Color(0xFFF1F5F9)),
          ),
          padding: const EdgeInsets.all(12),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Expanded(
                child: Container(
                  width: double.infinity,
                  decoration: BoxDecoration(
                    color: const Color(0xFFF8FAFC),
                    borderRadius: BorderRadius.circular(16),
                  ),
                  child: const Center(child: Icon(Icons.medication, size: 40, color: Color(0xFF2563EB))),
                ),
              ),
              const SizedBox(height: 12),
              const Text('Medicine Name', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
              const Text('Strip of 10', style: TextStyle(color: Colors.grey, fontSize: 10)),
              const SizedBox(height: 8),
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  const Text('Rs. 150', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
                  IconButton(
                    onPressed: () {},
                    icon: const Icon(Icons.add_shopping_cart, size: 18, color: Color(0xFF2563EB)),
                    style: IconButton.styleFrom(backgroundColor: const Color(0xFFDBEAFE)),
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
