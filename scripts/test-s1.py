#!/usr/bin/env python3
"""Test S1 functionality: photo upload, inventory (jaula), plan de acción"""
import requests
import json
import sys
import os

BASE = 'http://127.0.0.1:3000'
PROJECT_ID = 'cmroxojzp0006jy04ot7detrw'  # 5S Almacén Central

created_items = []

def test_upload():
    """Test 1: Upload a photo file"""
    print("=" * 60)
    print("TEST 1: Upload de foto")
    print("=" * 60)
    
    # Create a tiny test JPEG
    test_image = b'\xff\xd8\xff\xe0\x00\x10JFIF\x00\x01\x01\x00\x00\x01\x00\x01\x00\x00\xff\xdb\x00C\x00\x08\x06\x06\x07\x06\x05\x08\x07\x07\x07\t\t\x08\n\x0c\x14\r\x0c\x0b\x0b\x0c\x19\x12\x13\x0f\x14\x1d\x1a\x1f\x1e\x1d\x1a\x1c\x1c $.\' ",#\x1c\x1c(7),01444\x1f\'9=82<.342\xff\xc0\x00\x0b\x08\x00\x01\x00\x01\x01\x01\x11\x00\xff\xc4\x00\x14\x00\x01\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\n\xff\xda\x00\x08\x01\x01\x00\x00?\x00\x54\xaf\x00\xff\xd9'
    
    files = {
        'file': ('test_s1.jpg', test_image, 'image/jpeg'),
    }
    data = {
        'filename': 's1_test_photo.jpg',
    }
    
    try:
        res = requests.post(f'{BASE}/api/upload', files=files, data=data, timeout=15)
        result = res.json()
        if result.get('success') and result.get('url'):
            print(f"  ✅ Upload exitoso!")
            print(f"  URL: {result['url']}")
            return result['url']
        else:
            print(f"  ❌ Upload fallido: {result}")
            return None
    except Exception as e:
        print(f"  ❌ Error: {e}")
        return None

def test_inventory_item(photo_url):
    """Test 2: Create S1 inventory item (innecesario → jaula)"""
    print("\n" + "=" * 60)
    print("TEST 2: Crear item S1 innecesario (→ jaula)")
    print("=" * 60)
    
    payload = {
        "sStep": 1,
        "projectId": PROJECT_ID,
        "name": "Test S1 - Elemento Innecesario",
        "category": "innecesario",
        "quantity": 2,
        "location": "Zona Producción A",
        "price": 150.50,
        "extra": {
            "estado": "Malo",
            "frecuenciaUso": "Nunca",
            "decision": "Jaula",
            "diasCuarentena": "30"
        },
        "zonaOrigen": "Zona Producción A",
        "photoUrl": photo_url,
    }
    
    try:
        res = requests.post(f'{BASE}/api/inventory', json=payload, timeout=15)
        result = res.json()
        if result.get('success') and result.get('data'):
            item = result['data']
            print(f"  ✅ Item creado: {item['name']}")
            print(f"  ID: {item['id']}")
            print(f"  jaulaStatus: {item.get('jaulaStatus', 'NO SET')}")
            print(f"  jaulaFechaEntrada: {item.get('jaulaFechaEntrada', 'NO SET')}")
            print(f"  jaulaFechaLimite: {item.get('jaulaFechaLimite', 'NO SET')}")
            print(f"  jaulaOrigen: {item.get('jaulaOrigen', 'NO SET')}")
            
            if item.get('jaulaStatus') == 'en_jaula':
                print(f"  ✅ Auto-asignación a JAULA funciona correctamente!")
            else:
                print(f"  ❌ Auto-asignación a jaula FALLÓ (esperado 'en_jaula', obtenido '{item.get('jaulaStatus')}')")
            
            created_items.append(('inventory', item['id']))
            return item
        else:
            print(f"  ❌ Error creando item: {result}")
            return None
    except Exception as e:
        print(f"  ❌ Error: {e}")
        return None

def test_photo_library(photo_url, item_id):
    """Test 3: Create photo library entry linked to inventory item"""
    print("\n" + "=" * 60)
    print("TEST 3: Crear entrada en photo-library (foto vinculada)")
    print("=" * 60)
    
    payload = {
        "sStep": 1,
        "miniStep": 2,
        "title": "S1 Seiri - Zona Producción A - ANTES 1 (20/7/2026)",
        "photoUrl": photo_url or "/uploads/photos/s1_test_photo.jpg",
        "photoType": "antes",
        "category": "paso2_s1",
        "projectId": PROJECT_ID,
        "uploadedBy": "test_script",
        "inventoryItemId": item_id,
    }
    
    try:
        res = requests.post(f'{BASE}/api/photo-library', json=payload, timeout=15)
        result = res.json()
        if result.get('success') and result.get('data'):
            photo = result['data']
            print(f"  ✅ Photo library entry creada: {photo['title']}")
            print(f"  Photo URL: {photo['photoUrl']}")
            print(f"  InventoryItemId: {photo.get('inventoryItemId', 'N/A')}")
            print(f"  PhotoType: {photo.get('photoType', 'N/A')}")
            created_items.append(('photo', photo['id']))
            return photo
        else:
            print(f"  ❌ Error creando photo: {result}")
            return None
    except Exception as e:
        print(f"  ❌ Error: {e}")
        return None

def test_action_item():
    """Test 4: Create action item (plan de acción)"""
    print("\n" + "=" * 60)
    print("TEST 4: Crear action item (plan de acción)")
    print("=" * 60)
    
    payload = {
        "sStep": 1,
        "miniStep": 4,
        "itemId": "1.1.1",
        "itemDescription": "Elemento innecesario en zona de producción",
        "hallazgo": "Se detectó elemento innecesario acumulado en zona de producción A",
        "mejora": "Retirar elemento y enviar a jaula de cuarentena",
        "responsable": "Responsable Zona Producción",
        "prioridad": "alta",
        "estado": "abierta",
        "source": "actionplan",
        "projectId": PROJECT_ID,
        "comunicadoPor": "Gestor Principal",
        "seccionDemandante": "Producción",
        "personaDemandada": "Jefe de Producción",
        "seccionDemandada": "Mantenimiento",
        "clienteZona": "Zona Producción A",
        "accionCorrectiva": "Retirar elemento innecesario y trasladar a jaula",
        "accionesPreventivas": "Revisión semanal de elementos innecesarios en zona",
        "semanaPrevista": "Semana 30",
        "impactoObjetivo": "Liberar espacio en zona de producción",
        "enviado": "Sí",
    }
    
    try:
        res = requests.post(f'{BASE}/api/actions', json=payload, timeout=15)
        result = res.json()
        if result.get('success') and result.get('data'):
            action = result['data']
            print(f"  ✅ Action item creado: {action['hallazgo'][:60]}...")
            print(f"  ID: {action['id']}")
            print(f"  Estado: {action['estado']}")
            print(f"  Prioridad: {action.get('prioridad', 'N/A')}")
            print(f"  Comunicado por: {action.get('comunicadoPor', 'N/A')}")
            print(f"  Acción correctiva: {action.get('accionCorrectiva', 'N/A')}")
            print(f"  Acciones preventivas: {action.get('accionesPreventivas', 'N/A')}")
            print(f"  Semana prevista: {action.get('semanaPrevista', 'N/A')}")
            print(f"  Nº entrada: {action.get('numeroEntrada', 'N/A')}")
            created_items.append(('action', action['id']))
            return action
        else:
            print(f"  ❌ Error creando action item: {result}")
            return None
    except Exception as e:
        print(f"  ❌ Error: {e}")
        return None

def test_verify_jaula():
    """Test 5: Verify jaula items"""
    print("\n" + "=" * 60)
    print("TEST 5: Verificar items en jaula (registro jaula)")
    print("=" * 60)
    
    try:
        res = requests.get(f'{BASE}/api/inventory', params={"jaulaOnly": "true", "projectId": PROJECT_ID}, timeout=15)
        result = res.json()
        if result.get('success'):
            items = result['data']
            print(f"  Total items en jaula: {len(items)}")
            for item in items[:10]:
                limite = item.get('jaulaFechaLimite', 'N/A')
                if limite and limite != 'N/A':
                    from datetime import datetime
                    try:
                        limite = datetime.fromisoformat(limite.replace('Z', '+00:00')).strftime('%d/%m/%Y')
                    except:
                        pass
                print(f"  - {item['name']}: status={item['jaulaStatus']}, origen={item.get('jaulaOrigen', 'N/A')}, limite={limite}")
            return items
        else:
            print(f"  ❌ Error: {result}")
            return []
    except Exception as e:
        print(f"  ❌ Error: {e}")
        return []

def test_verify_s1_inventory():
    """Test 6: Verify S1 inventory items"""
    print("\n" + "=" * 60)
    print("TEST 6: Verificar items de inventario S1")
    print("=" * 60)
    
    try:
        res = requests.get(f'{BASE}/api/inventory', params={"sStep": 1, "projectId": PROJECT_ID}, timeout=15)
        result = res.json()
        if result.get('success'):
            items = result['data']
            print(f"  Total items S1: {len(items)}")
            for item in items[:10]:
                photo_count = len(item.get('photos', []))
                extra = item.get('extra', {})
                if isinstance(extra, str):
                    try:
                        extra = json.loads(extra)
                    except:
                        extra = {}
                decision = extra.get('decision', 'N/A') if isinstance(extra, dict) else 'N/A'
                print(f"  - {item['name']}: cat={item['category']}, decision={decision}, jaula={item.get('jaulaStatus', '')}, fotos={photo_count}")
            return items
        else:
            print(f"  ❌ Error: {result}")
            return []
    except Exception as e:
        print(f"  ❌ Error: {e}")
        return []

def test_verify_actions():
    """Test 7: Verify action items"""
    print("\n" + "=" * 60)
    print("TEST 7: Verificar action items (plan de acción)")
    print("=" * 60)
    
    try:
        res = requests.get(f'{BASE}/api/actions', params={"projectId": PROJECT_ID}, timeout=15)
        result = res.json()
        if result.get('success'):
            items = result['data']
            print(f"  Total action items: {len(items)}")
            for item in items[:10]:
                print(f"  - S{item['sStep']} [{item.get('source', '')}]: {item['hallazgo'][:50]}... estado={item['estado']}")
            return items
        else:
            print(f"  ❌ Error: {result}")
            return []
    except Exception as e:
        print(f"  ❌ Error: {e}")
        return []

def cleanup():
    """Clean up test data"""
    print("\n" + "=" * 60)
    print("LIMPIEZA: Eliminando datos de test")
    print("=" * 60)
    
    for type_, id_ in created_items:
        try:
            if type_ == 'inventory':
                res = requests.delete(f'{BASE}/api/inventory', params={"id": id_}, timeout=10)
                print(f"  Deleted inventory item {id_}: {res.json().get('success', False)}")
            elif type_ == 'photo':
                res = requests.delete(f'{BASE}/api/photo-library', params={"id": id_}, timeout=10)
                print(f"  Deleted photo library entry {id_}: {res.json().get('success', False)}")
            elif type_ == 'action':
                res = requests.delete(f'{BASE}/api/actions', params={"id": id_}, timeout=10)
                print(f"  Deleted action item {id_}: {res.json().get('success', False)}")
        except Exception as e:
            print(f"  Error deleting {type_} {id_}: {e}")

def main():
    print("\n🔍 TEST COMPLETO DE FUNCIONALIDAD S1")
    print("=" * 60)
    
    # Test 1: Upload
    photo_url = test_upload()
    
    # Test 2: Inventory item (innecesario → jaula)
    inv_item = test_inventory_item(photo_url)
    
    # Test 3: Photo library entry
    if inv_item:
        test_photo_library(photo_url, inv_item['id'])
    
    # Test 4: Action item (plan de acción)
    test_action_item()
    
    # Test 5: Verify jaula
    test_verify_jaula()
    
    # Test 6: Verify S1 inventory
    test_verify_s1_inventory()
    
    # Test 7: Verify actions
    test_verify_actions()
    
    # Cleanup
    cleanup()
    
    print("\n" + "=" * 60)
    print("✅ TEST COMPLETO FINALIZADO")
    print("=" * 60)

if __name__ == '__main__':
    main()
